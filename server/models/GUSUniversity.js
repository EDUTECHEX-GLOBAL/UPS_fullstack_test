// models/GUSUniversity.js
import mongoose from 'mongoose';

const programSchema = new mongoose.Schema({
  id: String,
  title: String,
  locations: [String],
  studyMode: String,
  level: String,
  actions: [String]
}, { _id: false });

const majorAreaSchema = new mongoose.Schema({
  major_area: String,
  specific_programs: [{
    program_name: String
  }]
}, { _id: false });

const gusDataSchema = new mongoose.Schema({
  country: String,
  level: String,
  major_areas: [majorAreaSchema],
  programs_data: [programSchema]
}, { _id: false });

const gusUniversitySchema = new mongoose.Schema({
  UNITID: { type: Number, unique: true, index: true },
  INSTNM: { type: String, index: true },
  IALIAS: String,
  ADDR: String,
  CITY: String,
  STABBR: String,
  ZIP: String,
  FIPS: Number,
  OBEREG: Number,
  CHFNM: String,
  CHFTITLE: String,
  GENTELE: String,
  WEBADDR: String,
  ADMINURL: String,
  FAIDURL: String,
  APPLURL: String,
  SECTOR: Number,
  ICLEVEL: Number,
  CONTROL: Number,
  HLOFFER: Number,
  UGOFFER: Number,
  GROFFER: Number,
  DEGGRANT: Number,
  HBCU: Number,
  LOCALE: Number,
  OPENPUBL: Number,
  CYACTIVE: Number,
  POSTSEC: Number,
  INSTCAT: Number,
  LANDGRNT: Number,
  INSTSIZE: Number,
  LONGITUD: Number,
  LATITUDE: Number,
  GUS_DATA: gusDataSchema
}, {
  timestamps: true,
  collection: 'gusuniversities'
});

// Create text index for search
gusUniversitySchema.index({ 
  INSTNM: 'text', 
  IALIAS: 'text',
  'GUS_DATA.country': 'text',
  'GUS_DATA.major_areas.major_area': 'text',
  'GUS_DATA.programs_data.title': 'text'
});

const GUSUniversity = mongoose.model('GUSUniversity', gusUniversitySchema);
export default GUSUniversity;