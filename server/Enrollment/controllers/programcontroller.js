import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ProgramSelection from '../model/programmodel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usStates = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
]);

const extractCountryName = (locationStr = '') => {
  if (!locationStr) return '';
  let loc = String(locationStr).trim();
  if (!loc) return '';
  if (loc === 'NY/LA' || loc === 'Digital/Virtual' || loc === 'Northern California') return 'USA';
  if (loc === 'Canada/USA') return 'Canada';
  if (loc === 'UK/Global') return 'UK';
  if (loc === 'Scotland, UK') return 'UK';
  if (loc === 'Vancouver, Canada') return 'Canada';
  if (loc === 'Dubai, UAE') return 'UAE';
  if (loc === 'Putrajaya, Malaysia') return 'Malaysia';
  if (loc.includes(',')) {
    const parts = loc.split(',').map(p => p.trim());
    const lastPart = parts[parts.length - 1];
    if (usStates.has(lastPart.toUpperCase())) return 'USA';
    return lastPart;
  }
  return loc;
};

export const getProgramCountries = async (req, res) => {
  try {
    const rawType = (req.query.programType || '').toString().toLowerCase().trim();

    let fileName = 'bacheloruniversity.json';
    if (rawType.includes('master') || rawType === 'pg') {
      fileName = 'masteruniversity.json';
    } else if (rawType.includes('medical') || rawType === 'mbbs') {
      fileName = 'medicaluniversity.json';
    } else if (rawType.includes('bachelor') || rawType === 'ug') {
      fileName = 'bacheloruniversity.json';
    }

    const filePath = path.join(process.cwd(), 'server', fileName);
    const altFilePath = path.join(process.cwd(), fileName);
    const relPath = path.resolve(__dirname, '../..', fileName);
    const relAltPath = path.resolve(__dirname, '../../..', fileName);

    let jsonPath = fs.existsSync(filePath)
      ? filePath
      : fs.existsSync(altFilePath)
      ? altFilePath
      : fs.existsSync(relPath)
      ? relPath
      : fs.existsSync(relAltPath)
      ? relAltPath
      : null;

    if (!jsonPath) {
      return res.status(404).json({ success: false, message: `University data file ${fileName} not found.` });
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(fileContent);

    const countrySet = new Set();
    if (Array.isArray(data)) {
      data.forEach(item => {
        const rawCountry = item['Country / Location'] || item['country'] || item['Country'] || item['location'] || '';
        const country = extractCountryName(rawCountry);
        if (country) {
          countrySet.add(country);
        }
      });
    }

    const countries = Array.from(countrySet).sort((a, b) => a.localeCompare(b));

    return res.status(200).json({
      success: true,
      programType: rawType,
      countries,
      count: countries.length,
    });
  } catch (error) {
    console.error("Error fetching program countries:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

export const getProgramSelection = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const details = await ProgramSelection.findOne({ userId });
    
    if (!details) {
      return res.status(200).json({ success: true, data: null, message: "No program selection found." });
    }

    res.status(200).json({ success: true, data: details });
  } catch (error) {
    console.error("Error fetching program selection:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

export const saveProgramSelection = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { programSelection } = req.body;

    const payload = programSelection || req.body;
    const pType = payload?.programType || '';
    const countries = payload?.selectedCountries || (payload?.countryName ? [payload.countryName] : []);
    const cName = payload?.countryName || (countries[0] || '');
    const uId = payload?.universityId || '';
    const uName = payload?.universityName || '';

    const updateData = {
      userId,
      programSelection: payload,
      programType: pType,
      selectedCountries: countries,
      countryName: cName,
      universityId: uId,
      universityName: uName,
      status: 'Completed',
      isEdited: true,
      editedAt: new Date()
    };

    const updatedDetails = await ProgramSelection.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ 
      success: true, 
      message: "Program selection saved successfully", 
      data: updatedDetails 
    });
  } catch (error) {
    console.error("Error saving program selection:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

