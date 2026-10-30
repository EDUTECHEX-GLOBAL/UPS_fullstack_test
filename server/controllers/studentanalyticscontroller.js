// src/controllers/studentanalyticscontroller.js
import UserProfile from '../models/userprofilemodel.js';

// Import the shared helper from userprofilecontroller so we have one source
// of truth for fixing Map → plain object at both top-level and nested levels.
// Previously this file had its own local fixCourses() that only fixed the
// top-level selectedCourses and missed the nested ones inside each university,
// causing the expanded detail row in StudentAnalytics.js to show empty courses.
import { fixCoursesOnProfile } from '../controllers/userprofilecontroller.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL STUDENT PROFILES  (paginated + filterable)
// GET /api/analytics/profiles
// Query: page, limit, program, segment, status, search
// ─────────────────────────────────────────────────────────────────────────────
export const getStudentProfiles = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const query = {};

    // Filter by section
    if (req.query.section === 'medical') {
      query.eligibleProgram = 'Medical';
    } else if (req.query.section === 'general') {
      query.eligibleProgram = { $ne: 'Medical' };
    }

    // Filter by program
    if (req.query.program) {
      if (!['Bachelor', 'Master', 'PhD', 'Medical'].includes(req.query.program))
        return res.status(400).json({ success: false, message: 'Invalid program. Use Bachelor, Master, PhD or Medical.' });
      query.eligibleProgram = req.query.program;
    }

    // Filter by segment
    if (req.query.segment) {
      query['selectedSegment.id'] = req.query.segment;
    }

    // Filter by completion status
    if (req.query.status === 'complete') query.profileCompleted = true;
    if (req.query.status === 'pending')  query.profileCompleted = false;

    // Server-side search across name, email, university name
    if (req.query.search?.trim()) {
      const s = req.query.search.trim();
      query.$or = [
        { 'basicInfo.fullName':        { $regex: s, $options: 'i' } },
        { 'basicInfo.email':           { $regex: s, $options: 'i' } },
        { 'selectedUniversities.name': { $regex: s, $options: 'i' } },
      ];
    }

    const [profiles, total] = await Promise.all([
      UserProfile.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      UserProfile.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: profiles.map(fixCoursesOnProfile),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('❌ getStudentProfiles:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profiles', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ANALYTICS SUMMARY STATS
// GET /api/analytics/stats
// Returns counts, breakdowns and top lists for the dashboard stat cards.
// FIX: added recentWeekCount so StudentAnalytics.js can show real data
//      instead of the hardcoded "+48 this week" string.
// ─────────────────────────────────────────────────────────────────────────────
export const getAnalyticsStats = async (req, res) => {
  try {
    const query = {};
    if (req.query.section === 'medical') {
      query.eligibleProgram = 'Medical';
    } else if (req.query.section === 'general') {
      query.eligibleProgram = { $ne: 'Medical' };
    }

    const [
      total,
      completedCount,
      programStats,
      segmentStats,
      topUniversities,
      topCourses,
      fieldStats,
      totalCoursesResult,
      uniqueUnisResult,
      recentWeekResult,
    ] = await Promise.all([

      UserProfile.countDocuments(query),

      UserProfile.countDocuments({ ...query, profileCompleted: true }),

      // Program breakdown — Bachelor / Master / PhD
      UserProfile.aggregate([
        { $match: query },
        { $group: { _id: '$eligibleProgram', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Segment breakdown
      UserProfile.aggregate([
        { $match: { ...query, selectedSegment: { $ne: null } } },
        {
          $group: {
            _id:   '$selectedSegment.id',
            name:  { $first: '$selectedSegment.name' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Top 10 universities by how many students selected them
      UserProfile.aggregate([
        { $match: query },
        { $unwind: '$selectedUniversities' },
        { $group: { _id: '$selectedUniversities.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, name: '$_id', count: 1 } },
      ]),

      // Top 10 courses by selection count
      // title field is guaranteed by processUniversityData in userprofilecontroller
      UserProfile.aggregate([
        { $match: query },
        { $unwind: '$selectedUniversities' },
        { $unwind: '$selectedUniversities.selectedCourses' },
        {
          $group: {
            _id:        '$selectedUniversities.selectedCourses.title',
            count:      { $sum: 1 },
            university: { $first: '$selectedUniversities.name' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, title: '$_id', count: 1, university: 1 } },
      ]),

      // Top 20 fields of study (from education.field)
      UserProfile.aggregate([
        { $match: { ...query, 'education.field': { $exists: true, $ne: '' } } },
        { $group: { _id: '$education.field', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
        { $project: { _id: 0, field: '$_id', count: 1 } },
      ]),

      // Total individual course selections across all profiles
      UserProfile.aggregate([
        { $match: query },
        { $unwind: '$selectedUniversities' },
        { $unwind: '$selectedUniversities.selectedCourses' },
        { $count: 'total' },
      ]),

      // Count of unique universities selected across all profiles
      UserProfile.aggregate([
        { $match: query },
        { $unwind: '$selectedUniversities' },
        { $group: { _id: '$selectedUniversities.name' } },
        { $count: 'total' },
      ]),

      // Profiles created in the last 7 days
      // This value is returned as recentWeekCount and consumed by
      // StudentAnalytics.js to replace the hardcoded "+48 this week"
      UserProfile.countDocuments({
        ...query,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const totalCourses       = totalCoursesResult[0]?.total || 0;
    const uniqueUniversities = uniqueUnisResult[0]?.total   || 0;
    const completedPct       = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const avgCourses         = total > 0 ? (totalCourses / total).toFixed(1) : '0.0';

    return res.status(200).json({
      success: true,
      data: {
        total,
        completedCount,
        completedPct,
        totalCourses,
        uniqueUniversities,
        avgCourses,
        recentWeekCount: recentWeekResult, // consumed by StudentAnalytics.js stat card sub prop
        programStats,
        segmentStats,
        topUniversities,
        topCourses,
        fieldStats,
      },
    });
  } catch (error) {
    console.error('❌ getAnalyticsStats:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE STUDENT PROFILE DETAIL
// GET /api/analytics/profiles/:userId
// userId is the string field on UserProfile, NOT the MongoDB _id.
// FIX: now uses the shared fixCoursesOnProfile instead of the old local
//      fixCourses which missed nested courses inside selectedUniversities.
// ─────────────────────────────────────────────────────────────────────────────
export const getStudentProfileDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId)
      return res.status(400).json({ success: false, message: 'userId param is required' });

    const profile = await UserProfile.findOne({ userId }).lean();
    if (!profile)
      return res.status(404).json({ success: false, message: 'Profile not found' });

    return res.status(200).json({ success: true, data: fixCoursesOnProfile(profile) });
  } catch (error) {
    console.error('❌ getStudentProfileDetail:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile detail', error: error.message });
  }
};

export default { getStudentProfiles, getAnalyticsStats, getStudentProfileDetail };