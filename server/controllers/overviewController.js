import Overview  from '../models/overviewModel.js';
import Account   from '../models/accountModel.js';
import mongoose  from 'mongoose';

const DIRECT_PROGRAM_NAME = 'Direct University Application';

const normalizeCoursePayload = (courseData = {}) => {
  const programName = courseData.programName || courseData.title || courseData.name;
  const programId   = courseData.programId || courseData._id || courseData.id;

  return {
    ...courseData,
    programId,
    programName,
    universityId:   courseData.universityId || courseData.UNITID || '',
    universityName: courseData.universityName || courseData.university || courseData.INSTNM || '',
  };
};

const isDirectCourse = (courseData = {}) =>
  courseData.programName === DIRECT_PROGRAM_NAME || courseData.isDirectApply === true;

/* ═══════════════════════════════════════════════════════
   STUDENT — GET overview(s) for the logged-in user
   Returns ALL overviews so the frontend can pick the
   correct one by applicationId.
═══════════════════════════════════════════════════════ */
export const getOverview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { applicationId } = req.query;

    if (applicationId) {
      const overview = await Overview.findOne({ userId, applicationId });
      if (overview) {
        const overviews = await Overview.find({ userId }).sort({ createdAt: -1 });
        return res.status(200).json({
          success: true,
          overview,
          overviews,
        });
      }
    }

    // Return every application this user owns, newest first
    const overviews = await Overview.find({ userId }).sort({ createdAt: -1 });

    // If the user has no overview yet, create a blank one
    if (overviews.length === 0) {
      const blank = new Overview({
        userId,
        applicationStatus: 'not_started',
        progress: { percentage: 0, currentStep: 'personal' },
      });
      await blank.save();

      return res.status(200).json({
        success:  true,
        overview: blank,           // single object — backward compatible
        overviews: [blank],        // array for new multi-app support
      });
    }

    // Backward-compatible: also return the most recent one as `overview`
    return res.status(200).json({
      success:  true,
      overview: overviews[0],
      overviews,
    });

  } catch (error) {
    console.error('❌ Error in getOverview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch overview data',
      error:   error.message,
    });
  }
};

/* ═══════════════════════════════════════════════════════
   STUDENT — CREATE a brand-new overview (new application)
   Called when a student picks a new course/university.
   Each course selection gets its own Overview document.
═══════════════════════════════════════════════════════ */
export const createOverview = async (req, res) => {
  try {
    const userId    = req.user.userId;
    const courseData = req.body;   // expects selectedCourse fields

    if (!courseData.programId || !courseData.programName || !courseData.universityName) {
      return res.status(400).json({
        success: false,
        message: 'programId, programName and universityName are required to create an application.',
      });
    }

    const newOverview = new Overview({
      userId,
      selectedCourse: {
        ...courseData,
        selectedAt: Date.now(),
      },
      applicationStatus: 'not_started',
      progress: { percentage: 0, currentStep: 'personal' },
    });

    await newOverview.save();

    return res.status(201).json({
      success:  true,
      message:  'New application created successfully.',
      overview: newOverview,
    });

  } catch (error) {
    console.error('❌ Error in createOverview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create new application.',
      error:   error.message,
    });
  }
};

/* ═══════════════════════════════════════════════════════
   STUDENT — Update selected course on a specific overview
   PATCH /api/overview/:applicationId/course
═══════════════════════════════════════════════════════ */
export const updateSelectedCourse = async (req, res) => {
  try {
    const userId      = req.user.userId;
    const { applicationId } = req.params;
    const courseData  = req.body;

    if (!courseData.programId || !courseData.programName) {
      return res.status(400).json({
        success: false,
        message: 'programId and programName are required.',
      });
    }

    const overview = await Overview.findOne({ userId, applicationId });
    if (!overview) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
    }

    overview.selectedCourse = { ...courseData, selectedAt: Date.now() };

    // Mark the courses step as completed
    const stepIdx = overview.steps.findIndex((s) => s.stepId === 'courses');
    if (stepIdx !== -1) {
      overview.steps[stepIdx].completed   = true;
      overview.steps[stepIdx].completedAt = Date.now();
    }

    await overview.save();

    return res.status(200).json({
      success:  true,
      message:  'Course updated successfully.',
      overview,
    });

  } catch (error) {
    console.error('❌ Error in updateSelectedCourse:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update course.',
      error:   error.message,
    });
  }
};

/* ═══════════════════════════════════════════════════════
   STUDENT — Update a specific field's completion status
   PUT /api/overview/:applicationId/field
═══════════════════════════════════════════════════════ */
export const updateFieldCompletion = async (req, res) => {
  try {
    const userId          = req.user.userId;
    const { applicationId } = req.params;
    const { section, field, isCompleted } = req.body;

    if (!section || !field) {
      return res.status(400).json({ success: false, message: 'section and field are required.' });
    }

    const overview = await Overview.findOne({ userId, applicationId });
    if (!overview) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (
      overview.completedFields[section] &&
      overview.completedFields[section][field] !== undefined
    ) {
      overview.completedFields[section][field] = isCompleted;
      _updateStepCompletion(overview, section);
      await overview.save();

      return res.status(200).json({ success: true, message: 'Field updated.', overview });
    }

    return res.status(400).json({ success: false, message: 'Invalid section or field.' });

  } catch (error) {
    console.error('❌ Error in updateFieldCompletion:', error);
    return res.status(500).json({ success: false, message: 'Failed to update field.', error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════
   STUDENT — Update current step
   PUT /api/overview/:applicationId/step
═══════════════════════════════════════════════════════ */
export const updateCurrentStep = async (req, res) => {
  try {
    const userId          = req.user.userId;
    const { applicationId } = req.params;
    const { stepId }      = req.body;

    if (!stepId) {
      return res.status(400).json({ success: false, message: 'stepId is required.' });
    }

    const overview = await Overview.findOne({ userId, applicationId });
    if (!overview) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    overview.progress.currentStep = stepId;
    await overview.save();

    return res.status(200).json({ success: true, message: 'Step updated.', overview });

  } catch (error) {
    console.error('❌ Error in updateCurrentStep:', error);
    return res.status(500).json({ success: false, message: 'Failed to update step.', error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════
   STUDENT — Reset a specific application
   POST /api/overview/:applicationId/reset
═══════════════════════════════════════════════════════ */
export const resetOverview = async (req, res) => {
  try {
    const userId          = req.user.userId;
    const { applicationId } = req.params;

    const overview = await Overview.findOne({ userId, applicationId });
    if (!overview) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Reset completedFields
    ['personalInfo', 'addressInfo', 'educationInfo', 'languageInfo'].forEach((section) => {
      Object.keys(overview.completedFields[section]).forEach((key) => {
        overview.completedFields[section][key] = false;
      });
    });

    // Reset steps
    overview.steps.forEach((step) => {
      step.completed   = false;
      step.completedAt = null;
    });

    overview.selectedCourse           = null;
    overview.progress.percentage      = 0;
    overview.progress.currentStep     = 'personal';
    overview.applicationStatus        = 'not_started';

    await overview.save();

    return res.status(200).json({ success: true, message: 'Application reset.', overview });

  } catch (error) {
    console.error('❌ Error in resetOverview:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset.', error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════
   PROCESS ADMIN — GET ALL OVERVIEW APPLICATIONS
   GET /api/overview/process-admin/applications
   Mirrors the pattern used in gusuniversitycontroller.js
═══════════════════════════════════════════════════════ */
export const getOverviewApplications = async (req, res) => {
  try {
    const {
      page   = 1,
      limit  = 50,
      status,
      search,
    } = req.query;

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

    // Build query filter
    const query = {};
    if (status && status !== 'all') {
      const statusMap = {
        completed:  'completed',
        inprogress: 'in_progress',
        notstarted: 'not_started',
        submitted:  'submitted',
      };
      if (statusMap[status]) query.applicationStatus = statusMap[status];
    }

    const [overviews, total] = await Promise.all([
      Overview.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Overview.countDocuments(query),
    ]);

    if (!overviews.length) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { total: 0, page: pageNum, pages: 0, limit: limitNum },
      });
    }

    // Fetch student account info for names/emails
    const userIds = overviews.map((o) => o.userId).filter(Boolean);
    const accounts = await Account.find({ _id: { $in: userIds } })
      .select('firstName lastName email phone')
      .lean();

    const accountMap = {};
    accounts.forEach((a) => { accountMap[a._id.toString()] = a; });

    // Shape the response — always use selectedCourse.universityName
    let data = overviews.map((ov) => {
      const account = accountMap[ov.userId?.toString()] || {};

      return {
        _id:             ov._id,
        applicationId:   ov.applicationId   || '',
        userId:          ov.userId          || '',
        studentName:     [account.firstName, account.lastName].filter(Boolean).join(' ') || 'Unknown',
        email:           account.email      || '',
        phone:           account.phone      || '',
        // ✅ Always read university name directly from selectedCourse
        universityName:  ov.selectedCourse?.universityName  || 'N/A',
        universityId:    ov.selectedCourse?.universityId    || '',
        programName:     ov.selectedCourse?.programName     || 'N/A',
        programId:       ov.selectedCourse?.programId       || '',
        intakeMonth:     ov.selectedCourse?.intakeMonth     || '',
        intakeYear:      ov.selectedCourse?.intakeYear      || '',
        applicationStatus: ov.applicationStatus             || 'not_started',
        progress:          ov.progress?.percentage          ?? 0,
        currentStep:       ov.progress?.currentStep         || 'personal',
        steps:             ov.steps                         || [],
        completedFields:   ov.completedFields               || {},
        createdAt:         ov.createdAt,
        updatedAt:         ov.updatedAt,
      };
    });

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (d) =>
          d.studentName?.toLowerCase().includes(q)    ||
          d.email?.toLowerCase().includes(q)          ||
          d.applicationId?.toLowerCase().includes(q)  ||
          d.universityName?.toLowerCase().includes(q) ||
          d.programName?.toLowerCase().includes(q)
      );
    }

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page:  pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });

  } catch (error) {
    console.error('❌ Error in getOverviewApplications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch overview applications.',
      error:   process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/* ═══════════════════════════════════════════════════════
   PROCESS ADMIN — GET SINGLE APPLICATION DETAIL
   GET /api/overview/process-admin/applications/:applicationId
═══════════════════════════════════════════════════════ */
export const getOverviewApplicationById = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const overview = await Overview.findOne({ applicationId }).lean();
    if (!overview) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const account = await Account.findById(overview.userId)
      .select('firstName lastName email phone')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        ...overview,
        studentName:    [account?.firstName, account?.lastName].filter(Boolean).join(' ') || 'Unknown',
        email:          account?.email  || '',
        phone:          account?.phone  || '',
        // ✅ Always from selectedCourse — never overwritten
        universityName: overview.selectedCourse?.universityName || 'N/A',
        programName:    overview.selectedCourse?.programName    || 'N/A',
      },
    });

  } catch (error) {
    console.error('❌ Error in getOverviewApplicationById:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch application detail.',
      error:   process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/* ═══════════════════════════════════════════════════════
   PROCESS ADMIN — STATS SUMMARY
   GET /api/overview/process-admin/stats
═══════════════════════════════════════════════════════ */
export const getOverviewStats = async (req, res) => {
  try {
    const all = await Overview.find().select('applicationStatus').lean();

    const stats = {
      total:      all.length,
      completed:  all.filter((o) => o.applicationStatus === 'completed').length,
      inProgress: all.filter((o) => o.applicationStatus === 'in_progress').length,
      notStarted: all.filter((o) => o.applicationStatus === 'not_started').length,
      submitted:  all.filter((o) => o.applicationStatus === 'submitted').length,
    };

    return res.status(200).json({ success: true, stats });

  } catch (error) {
    console.error('❌ Error in getOverviewStats:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats.', error: error.message });
  }
};

/* ═══════════════════════════════════════════════════════
   ADMIN — DASHBOARD STATS (existing, kept for compatibility)
═══════════════════════════════════════════════════════ */
export const getDashboardStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }

    const [total, inProgress, completed, notStarted] = await Promise.all([
      Overview.countDocuments(),
      Overview.countDocuments({ applicationStatus: 'in_progress' }),
      Overview.countDocuments({ applicationStatus: 'completed' }),
      Overview.countDocuments({ applicationStatus: 'not_started' }),
    ]);

    const popularCourses = await Overview.aggregate([
      { $match: { 'selectedCourse.programId': { $exists: true } } },
      { $group: {
        _id:           '$selectedCourse.programId',
        programName:   { $first: '$selectedCourse.programName' },
        universityName:{ $first: '$selectedCourse.universityName' },
        count:         { $sum: 1 },
      }},
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalApplications: total,
        byStatus: { notStarted, inProgress, completed },
        popularCourses,
      },
    });

  } catch (error) {
    console.error('❌ Error in getDashboardStats:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats.', error: error.message });
  }
};

/* ─────────────────────────────────────────────
   PRIVATE HELPER — step completion from fields
───────────────────────────────────────────── */
const _updateStepCompletion = (overview, section) => {
  const stepMapping = {
    personalInfo:  'personal',
    addressInfo:   'address',
    educationInfo: 'education',
    languageInfo:  'language',
  };
  const stepId  = stepMapping[section];
  if (!stepId) return;

  const stepIdx = overview.steps.findIndex((s) => s.stepId === stepId);
  if (stepIdx === -1) return;

  const allDone = Object.values(overview.completedFields[section]).every((v) => v === true);
  overview.steps[stepIdx].completed = allDone;
  if (allDone && !overview.steps[stepIdx].completedAt) {
    overview.steps[stepIdx].completedAt = Date.now();
  }
};
// Add this to overviewController.js
export const upsertSelectedCourse = async (req, res) => {
  try {
    const userId    = req.user.userId;
    const { applicationId, ...rawCourseData } = req.body;
    const courseData = normalizeCoursePayload(rawCourseData);

    if (!courseData.programId || !courseData.programName || !courseData.universityName) {
      return res.status(400).json({
        success: false,
        message: 'programId, programName and universityName are required.',
      });
    }

    let overview = null;

    if (applicationId) {
      overview = await Overview.findOne({ userId, applicationId });
    }

    if (!overview && courseData.programId && courseData.universityId) {
      overview = await Overview.findOne({
        userId,
        'selectedCourse.programId': courseData.programId,
        'selectedCourse.universityId': courseData.universityId,
      });
    }

    if (overview) {
      // ✅ UPDATE existing — don't create a duplicate
      overview.selectedCourse = { ...courseData, selectedAt: Date.now() };

      if (overview.applicationStatus === 'submitted') {
        await Overview.updateOne(
          { _id: overview._id },
          {
            $set: {
              selectedCourse: overview.selectedCourse,
              applicationStatus: 'submitted',
              'progress.percentage': 100,
              'progress.currentStep': 'submitted',
              'progress.lastUpdated': new Date(),
            },
            $currentDate: { updatedAt: true },
          }
        );

        const submittedOverview = await Overview.findById(overview._id);
        return res.status(200).json({
          success:  true,
          message:  'Course updated on submitted application.',
          overview: submittedOverview,
          applicationId: submittedOverview.applicationId,
        });
      }

      await overview.save();

      return res.status(200).json({
        success:  true,
        message:  'Course updated on matching application.',
        overview,
        applicationId: overview.applicationId,
      });
    } else {
      // ✅ CREATE only if no overview exists at all
      const newOverview = new Overview({
        userId,
        selectedCourse: { ...courseData, selectedAt: Date.now() },
        applicationStatus: 'not_started',
        progress: { percentage: 0, currentStep: 'personal' },
      });
      await newOverview.save();

      return res.status(201).json({
        success:  true,
        message:  isDirectCourse(courseData) ? 'New direct application created.' : 'New course application created.',
        overview: newOverview,
        applicationId: newOverview.applicationId,
      });
    }
  } catch (error) {
    console.error('❌ Error in upsertSelectedCourse:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upsert course.',
      error:   error.message,
    });
  }
};
