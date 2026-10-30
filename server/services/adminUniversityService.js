import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to data files
const DATA_DIR = path.join(__dirname, '../data');
const UNIVERSITIES_FILE = path.join(DATA_DIR, 'universities.json');
const COLLEGES_FILE = path.join(DATA_DIR, 'colleges.json');

// Cache for loaded data
let cachedData = null;

/* ================================
   LOAD UNIVERSITY DATA FROM FILES
================================ */
export const loadUniversityData = () => {
  try {
    console.log('Looking for data files in:', DATA_DIR);
    
    // Check if data directory exists, if not create it
    if (!fs.existsSync(DATA_DIR)) {
      console.log('⚠️ Data directory not found, creating it...');
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let gusUniversities = [];
    let colleges = [];

    // Check if universities file exists
    if (fs.existsSync(UNIVERSITIES_FILE)) {
      try {
        const universitiesRaw = fs.readFileSync(UNIVERSITIES_FILE, 'utf8');
        const universitiesData = JSON.parse(universitiesRaw);
        gusUniversities = Array.isArray(universitiesData) 
          ? universitiesData 
          : universitiesData.data || universitiesData.universities || [];
        console.log(`✅ Loaded ${gusUniversities.length} universities from file`);
      } catch (error) {
        console.error('❌ Error reading universities.json:', error.message);
      }
    } else {
      console.log('⚠️ universities.json not found at:', UNIVERSITIES_FILE);
      console.log('   This is OK if you haven\'t imported data yet.');
    }

    // Check if colleges file exists
    if (fs.existsSync(COLLEGES_FILE)) {
      try {
        const collegesRaw = fs.readFileSync(COLLEGES_FILE, 'utf8');
        const collegesData = JSON.parse(collegesRaw);
        colleges = Array.isArray(collegesData) 
          ? collegesData 
          : collegesData.data || collegesData.colleges || [];
        console.log(`✅ Loaded ${colleges.length} colleges from file`);
      } catch (error) {
        console.error('❌ Error reading colleges.json:', error.message);
      }
    } else {
      console.log('⚠️ colleges.json not found at:', COLLEGES_FILE);
      console.log('   This is OK if you haven\'t imported data yet.');
    }

    // Cache the data
    cachedData = {
      gusUniversities,
      colleges,
      stats: {
        totalUniversities: gusUniversities.length,
        totalColleges: colleges.length,
        lastLoaded: new Date().toISOString()
      }
    };

    console.log(`📊 Loaded ${gusUniversities.length} universities and ${colleges.length} colleges from files`);

    return {
      colleges,
      gusUniversities
    };
  } catch (error) {
    console.error('❌ Error loading university data:', error);
    return { colleges: [], gusUniversities: [] };
  }
};

/* ================================
   GET DATA STATS
================================ */
export const getDataStats = () => {
  try {
    // If no cached data, load it
    if (!cachedData) {
      loadUniversityData();
    }

    // Check if files exist for file info
    let universitiesFileExists = false;
    let collegesFileExists = false;
    let universitiesFileSize = 0;
    let universitiesFileModified = null;
    let collegesFileSize = 0;
    let collegesFileModified = null;

    try {
      if (fs.existsSync(UNIVERSITIES_FILE)) {
        universitiesFileExists = true;
        const uniStat = fs.statSync(UNIVERSITIES_FILE);
        universitiesFileSize = uniStat.size;
        universitiesFileModified = uniStat.mtime;
      }

      if (fs.existsSync(COLLEGES_FILE)) {
        collegesFileExists = true;
        const colStat = fs.statSync(COLLEGES_FILE);
        collegesFileSize = colStat.size;
        collegesFileModified = colStat.mtime;
      }
    } catch (err) {
      console.error('Error getting file stats:', err);
    }

    return {
      universities: {
        count: cachedData?.gusUniversities?.length || 0,
        fileExists: universitiesFileExists,
        fileSize: universitiesFileSize,
        lastModified: universitiesFileModified
      },
      colleges: {
        count: cachedData?.colleges?.length || 0,
        fileExists: collegesFileExists,
        fileSize: collegesFileSize,
        lastModified: collegesFileModified
      },
      total: (cachedData?.gusUniversities?.length || 0) + (cachedData?.colleges?.length || 0),
      lastLoaded: cachedData?.stats?.lastLoaded || null
    };
  } catch (error) {
    console.error('Error getting data stats:', error);
    return {
      universities: { count: 0, fileExists: false },
      colleges: { count: 0, fileExists: false },
      total: 0,
      error: error.message
    };
  }
};

/* ================================
   REFRESH DATA CACHE
================================ */
export const refreshDataCache = () => {
  cachedData = null;
  return loadUniversityData();
};

/* ================================
   GET UNIVERSITIES BY FILTER
================================ */
export const getUniversitiesByFilter = (filter = {}) => {
  const { gusUniversities } = loadUniversityData();
  
  if (!gusUniversities || gusUniversities.length === 0) {
    return [];
  }

  return gusUniversities.filter(uni => {
    for (const [key, value] of Object.entries(filter)) {
      if (uni[key] !== value) {
        return false;
      }
    }
    return true;
  });
};

/* ================================
   GET COLLEGES BY FILTER
================================ */
export const getCollegesByFilter = (filter = {}) => {
  const { colleges } = loadUniversityData();
  
  if (!colleges || colleges.length === 0) {
    return [];
  }

  return colleges.filter(col => {
    for (const [key, value] of Object.entries(filter)) {
      if (col[key] !== value) {
        return false;
      }
    }
    return true;
  });
};

/* ================================
   SEARCH UNIVERSITIES IN FILE
================================ */
export const searchUniversitiesInFile = (searchTerm) => {
  const { gusUniversities } = loadUniversityData();
  
  if (!gusUniversities || gusUniversities.length === 0 || !searchTerm) {
    return [];
  }

  const term = searchTerm.toLowerCase();
  
  return gusUniversities.filter(uni => {
    return (
      (uni.INSTNM && uni.INSTNM.toLowerCase().includes(term)) ||
      (uni.IALIAS && uni.IALIAS.toLowerCase().includes(term)) ||
      (uni.CITY && uni.CITY.toLowerCase().includes(term)) ||
      (uni.STABBR && uni.STABBR.toLowerCase().includes(term))
    );
  });
};

/* ================================
   SEARCH COLLEGES IN FILE
================================ */
export const searchCollegesInFile = (searchTerm) => {
  const { colleges } = loadUniversityData();
  
  if (!colleges || colleges.length === 0 || !searchTerm) {
    return [];
  }

  const term = searchTerm.toLowerCase();
  
  return colleges.filter(col => {
    return (
      (col.INSTNM && col.INSTNM.toLowerCase().includes(term)) ||
      (col.IALIAS && col.IALIAS.toLowerCase().includes(term)) ||
      (col.CITY && col.CITY.toLowerCase().includes(term)) ||
      (col.STABBR && col.STABBR.toLowerCase().includes(term))
    );
  });
};

/* ================================
   GET UNIVERSITY BY UNITID
================================ */
export const getUniversityByUnitId = (unitId) => {
  const { gusUniversities } = loadUniversityData();
  
  if (!gusUniversities || gusUniversities.length === 0) {
    return null;
  }

  return gusUniversities.find(uni => uni.UNITID == unitId) || null;
};

/* ================================
   GET COLLEGE BY UNITID
================================ */
export const getCollegeByUnitId = (unitId) => {
  const { colleges } = loadUniversityData();
  
  if (!colleges || colleges.length === 0) {
    return null;
  }

  return colleges.find(col => col.UNITID == unitId) || null;
};

/* ================================
   VALIDATE DATA FILES
================================ */
export const validateDataFiles = () => {
  const issues = [];

  try {
    // Check if directories exist, create if not
    if (!fs.existsSync(DATA_DIR)) {
      issues.push(`Data directory does not exist, but will be created on demand: ${DATA_DIR}`);
      return { valid: true, issues, warning: true };
    }

    // Check universities file
    if (!fs.existsSync(UNIVERSITIES_FILE)) {
      issues.push(`Universities file not found: ${UNIVERSITIES_FILE} - This is OK if you haven't imported data yet`);
    } else {
      try {
        const content = fs.readFileSync(UNIVERSITIES_FILE, 'utf8');
        JSON.parse(content);
      } catch (err) {
        issues.push(`Universities file contains invalid JSON: ${err.message}`);
      }
    }

    // Check colleges file
    if (!fs.existsSync(COLLEGES_FILE)) {
      issues.push(`Colleges file not found: ${COLLEGES_FILE} - This is OK if you haven't imported data yet`);
    } else {
      try {
        const content = fs.readFileSync(COLLEGES_FILE, 'utf8');
        JSON.parse(content);
      } catch (err) {
        issues.push(`Colleges file contains invalid JSON: ${err.message}`);
      }
    }

    return {
      valid: true, // Still valid even if files don't exist
      issues,
      warning: issues.length > 0
    };
  } catch (error) {
    return {
      valid: true, // Still consider it valid to prevent crashes
      issues: [`Validation warning: ${error.message}`],
      warning: true
    };
  }
};