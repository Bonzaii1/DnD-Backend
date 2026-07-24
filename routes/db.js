const express = require('express');
const db = require('../lib/db')

const router = express.Router();

// DB routes go here

// Area Routes
router.get('/areas', async (req, res) => {

    try {
        const { rows } = await db.query('SELECT * FROM public."Area" ORDER BY id');
        res.json(rows)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Database error', details: err.message })
    }
})

router.get('/areas/:areaId', async (req, res) => {
    const areaId = req.params.areaId;
    try {
        const { rows } = await db.query('SELECT * FROM public."Area" WHERE id = $1 ORDER BY id', [areaId])
        res.json(rows[0])
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Database error with method', details: err.message })
    }
})


// Church Routes
router.get('/churches', async (req, res) => {

    const churchId = req.query.churchId
    const areaId = req.query.areaId
    try {
        let result;
        if (churchId && areaId) result = await db.query('SELECT * FROM public."Church" WHERE id = $1 AND "areaId" = $2 ORDER BY id', [churchId, areaId])
        else if (churchId) result = await db.query('SELECT * FROM public."Church" WHERE id = $1 ORDER BY id', [churchId])
        else if (areaId) result = await db.query('SELECT * FROM public."Church" WHERE "areaId" = $1 ORDER BY id', [areaId])
        else result = await db.query('SELECT * FROM public."Church" ORDER BY id')
        res.json(result.rows)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Database error: churches', details: err.message })
    }
})

router.get('/churches/:churchId', async (req, res) => {
    const churchId = req.params.churchId;

    try {
        const { rows } = await db.query('SELECT * FROM public."Church" WHERE id = $1 ORDER BY id', [churchId])
        res.json(rows[0])
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Database error: churches/churchId', details: err.message })
    }
})



router.get('/users', async (req, res) => {

    const userId = req.params.userId

    try {
        if (userId) {
            result = await db.query('SELECT * FROM public."User" WHERE id = $1', [userId])
            res.json(result[0])
        } else {
            result = await db.query('SELECT * FROM public."User"')
            res.json(result)
        }

    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Database error: users', details: err.message })
    }

})


router.get('/eventSeries', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                e."id",
                es."name" 
            FROM public."EventSeries" es
            LEFT JOIN public."Event" e 
                ON e."eventSeriesId" = es."id"
                AND e."occurrence_name" LIKE '%Unknown%'
            WHERE es."active" = 1
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error: eventSeries', details: err.message });
    }
});

router.get('/certificationTypes', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                * 
            FROM public."CertificationType" es
            WHERE "active" = 1
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error: certificationTypes', details: err.message });
    }
});

router.post('/register', async(req, res) => {

    const {pastEvents, certificationOption, userId, eventId, year} = req.body

    if (!userId || !certificationOption) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Verify user exists
        const { rows: userRows } = await db.query(
            `SELECT id FROM public."User" WHERE id = $1`,
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Register for the main event if eventId is provided
        if (eventId) {
            await db.query(`
                INSERT INTO public."Registration"(
                    "userId", "eventId")
                VALUES ($1, $2)
                ON CONFLICT ("userId", "eventId") DO NOTHING
                returning *;
            `,
                [userId, eventId]);
        }

        // Register for past events (historical data - status and registered_at are NULL until verified)
        if (pastEvents && pastEvents.length > 0) {
            for (const eventSeriesId of pastEvents) {
                await db.query(`
                    INSERT INTO public."Registration"(
                        "userId", "eventId", status, registered_at)
                    VALUES ($1, $2, NULL, NULL)
                    ON CONFLICT ("userId", "eventId") DO NOTHING
                    returning *;
                `,
                    [userId, eventSeriesId]);
            }
        }

        // Create user certification record
        const { rows: certRows } = await db.query(`
            INSERT INTO public."UserCertification"(
                "userId", "certificationTypeId", "eventId", year)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT ("userId", "certificationTypeId") DO UPDATE 
            SET "eventId" = EXCLUDED."eventId",
                updated_at = NOW()
            returning *;
        `,
            [userId, certificationOption, eventId, year]);

        const userCertificationId = certRows[0].id;

        // Get all requirements for this certification type
        const { rows: requirements } = await db.query(`
            SELECT id, requirement_type FROM public."CertificationRequirement"
            WHERE "certificationTypeId" = $1
            ORDER BY sort_order
        `,
            [certificationOption]);

        // Create default UserRequirementStatus records for each requirement
        for (const requirement of requirements) {
            const status = requirement.requirement_type === "AutoApprove" ? "approved" : "not_started" 
            await db.query(`
                INSERT INTO public."UserRequirementStatus"(
                    "userCertificationId", "certificationRequirementId", "status")
                VALUES ($1, $2, $3)
                ON CONFLICT ("userCertificationId", "certificationRequirementId") DO NOTHING
            `,
                [userCertificationId, requirement.id, status]);
        }

        res.status(201).json({ 
            success: true, 
            certification: certRows[0],
            requirementsCreated: requirements.length,
            message: 'Registration successful' 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error: register', details: err.message });
    }

})


router.post('/requirements', async (req, res) => {
    const { userId, recordCard, entranceEssay, notes, recommendation } = req.body;

    try {
        const { rows } = await db.query(
            `insert into public."Requirements"
            ("recordCard", "entranceEssay", notes, recommendations, "userId")
            values ($1, $2, $3, $4, $5)
            on conflict ("userId") do update set
                "recordCard" = GREATEST("Requirements"."recordCard", excluded."recordCard"),
                "entranceEssay" = GREATEST("Requirements"."entranceEssay", excluded."entranceEssay"),
                notes = GREATEST("Requirements".notes, excluded.notes),
                recommendations = GREATEST("Requirements".recommendations, excluded.recommendations),
                req_updated_at = NOW()
            returning *`,
            [recordCard, entranceEssay, notes, recommendation, userId]
        )
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Database error', details: err.message })
    }

})

// Get user's certification progress with requirements
router.get('/certifications/progress/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        // Get all certifications for the user
        const { rows: certifications } = await db.query(`
            SELECT 
                uc.id,
                uc."userId",
                uc."certificationTypeId",
                ct.name as "certificationTypeName",
                uc."eventId",
                e.occurrence_name as "eventName",
                uc.status,
                uc.started_at,
                uc.completed_at,
                uc.verified_at,
                uc.year,
                uc.notes
            FROM public."UserCertification" uc
            JOIN public."CertificationType" ct ON uc."certificationTypeId" = ct.id
            LEFT JOIN public."Event" e ON uc."eventId" = e.id
            WHERE uc."userId" = $1
            ORDER BY uc.started_at DESC
        `, [userId]);

        // For each certification, get its requirements and status
        const certificationsWithRequirements = await Promise.all(
            certifications.map(async (cert) => {
                const { rows: requirements } = await db.query(`
                    SELECT 
                        urs.id,
                        urs."userCertificationId",
                        urs."certificationRequirementId",
                        urs.status,
                        urs.submitted_at,
                        urs.approved_at,
                        urs.approved_by,
                        urs.notes,
                        urs.file_url,
                        cr.id as "requirementId",
                        cr.name as "requirementName",
                        cr.description as "requirementDescription",
                        cr.required as "requirementRequired",
                        cr.sort_order as "requirementSortOrder",
                        cr.requirement_type as "requirementType",
                        cr.required_for_reg as "requiredForRegistration"
                    FROM public."UserRequirementStatus" urs
                    JOIN public."CertificationRequirement" cr 
                        ON urs."certificationRequirementId" = cr.id
                    WHERE urs."userCertificationId" = $1
                    ORDER BY cr.sort_order, cr.id
                `, [cert.id]);

                // Format requirements for frontend
                const formattedRequirements = requirements.map(req => ({
                    id: req.id,
                    certificationRequirementId: req.certificationRequirementId,
                    status: req.status,
                    submitted_at: req.submitted_at,
                    approved_at: req.approved_at,
                    approved_by: req.approved_by,
                    notes: req.notes,
                    file_url: req.file_url,
                    requirement: {
                        id: req.requirementId,
                        name: req.requirementName,
                        description: req.requirementDescription,
                        required: req.requirementRequired,
                        sort_order: req.requirementSortOrder,
                        requirement_type: req.requirementType,
                        required_for_reg: req.requiredForRegistration
                    }
                }));

                return {
                    ...cert,
                    requirements: formattedRequirements
                };
            })
        );

        res.json(certificationsWithRequirements);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error: certifications/progress', details: err.message });
    }
});



module.exports = router;
