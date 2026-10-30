import PersonalDetails from '../model/personalmodel.js';
import EducationDetails from '../model/educationmodel.js';
import TestScores from '../model/testmodel.js';
import Documents from '../model/documentmodel.js';
import ProgramSelection from '../model/programmodel.js';
import UniversitySelection from '../model/universityselectionmodel.js';
import Account from '../../models/accountModel.js';

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user._id;

    const [personal, education, test, documents, program, university, account] = await Promise.all([
      PersonalDetails.findOne({ userId }).lean(),
      EducationDetails.findOne({ userId }).lean(),
      TestScores.findOne({ userId }).lean(),
      Documents.findOne({ userId }).lean(),
      ProgramSelection.findOne({ userId }).lean(),
      UniversitySelection.findOne({ userId }).lean(),
      Account.findById(userId).lean()
    ]);

    const isPersonalComplete = (doc) => doc?.status === 'Completed' || !!(doc?.firstName && doc?.email && doc?.mobile);
    const isEduComplete = (doc) => doc?.status === 'Completed' || (Array.isArray(doc?.educationDetails) && doc.educationDetails.length > 0);
    const isTestComplete = (doc) => doc?.status === 'Completed' || doc?.hasNotTaken || (Array.isArray(doc?.tests) && doc.tests.length > 0);
    const isDocComplete = (doc) => doc?.status === 'Completed' || (doc?.documents && Object.values(doc.documents).some(d => d.status === 'Uploaded'));
    const isProgComplete = (doc) => doc?.status === 'Completed' || !!(doc?.programSelection?.programType || doc?.programType);
    const isUniComplete = (doc) => doc?.status === 'Completed' || doc?.status === 'selected' || (Array.isArray(doc?.selectedUniversities) && doc.selectedUniversities.length > 0);

    const steps = [
      { id: 1, title: 'Personal Details', status: isPersonalComplete(personal) ? 'Completed' : 'Pending' },
      { id: 2, title: 'Education Details', status: isEduComplete(education) ? 'Completed' : 'Pending' },
      { id: 3, title: 'Test Scores', status: isTestComplete(test) ? 'Completed' : 'Pending' },
      { id: 4, title: 'Documents', status: isDocComplete(documents) ? 'Completed' : 'Pending' },
      { id: 5, title: 'Program Selection', status: isProgComplete(program) ? 'Completed' : 'Pending' },
      { id: 6, title: 'University Selection', status: isUniComplete(university) ? 'Completed' : 'Pending' },
    ];

    const completedCount = steps.filter(s => s.status === 'Completed').length;
    const pendingCount = steps.filter(s => s.status !== 'Completed').length;
    const overallProgress = Math.round((completedCount / steps.length) * 100);
    const nextStep = steps.find(s => s.status !== 'Completed') || steps[0];

    const firstName = personal?.firstName || account?.firstName || 'User';

    return res.status(200).json({
      success: true,
      data: {
        firstName,
        completedCount,
        pendingCount,
        overallProgress,
        nextStep,
        steps
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
