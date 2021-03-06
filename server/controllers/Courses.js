const axios = require('axios').default;
const readXlsxFile = require('read-excel-file/node');
const moment = require('moment');
const models = require('../models');
const helpers = require('./helpers');


const { Courses } = models;
// https://gist.github.com/christopherscott/2782634
const parseDateExcel = (excelTimestamp) => {
  const secondsInDay = 24 * 60 * 60;
  const excelEpoch = new Date(1899, 11, 31);
  const excelEpochAsUnixTimestamp = excelEpoch.getTime();
  const missingLeapYearDay = secondsInDay * 1000;
  const delta = excelEpochAsUnixTimestamp - missingLeapYearDay;
  const excelTimestampAsUnixTimestamp = excelTimestamp * secondsInDay * 1000;
  const parsed = excelTimestampAsUnixTimestamp + delta;
  return parsed || null;
};

const upload = async (req, res) => {
  const fullUrl = `${req.protocol}://${req.get('host')}`;
  try {
    if (req.file === undefined) {
      return res.status(400).error({ error: 'Please Upload an Excel File' });
    }

    const path = `${__dirname
    }../../../resources/static/assets/uploads/${req.file.filename}`;

    const coursesToAdd = [];
    const promises = [];

    readXlsxFile(path).then((rows) => {
      // remove headers for now
      rows.shift();

      rows.forEach((r) => {
        const dates = r[7].split(' - ');
        const nameSplit = r[11].split(',');
        console.log(nameSplit);
        promises.push(axios.get(
          `${fullUrl}/getFacultyByName?fname=${nameSplit[1].split(' ')[0]}&lname=${nameSplit[0]}`,
        ).then((result) => {
          const id = result.data.data._id;

          const courseData = {
            courseID: r[1],
            term: r[0],
            classNbr: r[2],
            subject: r[3],
            catalog: r[4],
            descr: r[6],
            section: r[5],
            startDate: dates[0],
            endDate: dates[1],
            days: r[8],
            mtgStart: moment(parseDateExcel(r[9])),
            mtgEnd: moment(parseDateExcel(r[10])),
            instructor: id,
          };

          coursesToAdd.push(courseData);
        }).catch((err) => {
          console.log(err.response.config.url);
        }));
      });
    });
    return Promise.all(promises).then(() => {
      Courses.CoursesModel.insertMany(coursesToAdd).then(() => res.json({ success: 'Successful upload' }))
        .catch((err) => res.status(400).json({ error: err.message }));
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: 'Something went wrong ' });
  }
};


const getAllCourses = (req, res) => Courses.CoursesModel.getAllCourses((err, docs) => {
  if (err || !docs) {
    return res.status(404).json({ error: 'No Courses Found' });
  }

  let schema = null;
  return helpers.buildTableStructureFromSchema(Courses.CoursesSchema).then((result) => {
    schema = result;
    return res.json({ data: docs, cols: schema });
  });
});

const addCourse = (request, response) => {
  // ?
  const req = request;
  const res = response;
  const { newData } = req.body;

  // validate
  if (!newData.courseID || !newData.term || !newData.classNbr
            || !newData.subject || !newData.catalog || !newData.descr
            || !newData.section || !newData.startDate || !newData.endDate
            || !newData.mtgStart || !newData.mtgEnd || !newData.instructor) {
    return res.status(400).json({ error: 'All fields are required' });
  }


  const courseData = {
    courseID: newData.courseID,
    term: newData.term,
    classNbr: newData.classNbr,
    subject: newData.subject,
    catalog: newData.catalog,
    descr: newData.descr,
    section: newData.section,
    startDate: newData.startDate,
    endDate: newData.endDate,
    mtgStart: newData.mtgStart,
    mtgEnd: newData.mtgEnd,
    instructor: newData.instructor,
  };

  const newCourse = new Courses.CoursesModel(courseData);
  return newCourse.save()
    .then(() => res.json({ success: `${newData.descr} has been created` }))
    .catch((err) => res.status(400).json({ error: err.message }));
};

const deleteCourse = (request, response) => {
  const req = request;
  const res = response;

  const data = req.body.oldData;

  return Courses.CoursesModel.findByIdAndDelete(data._id, (err) => {
    if (err) {
      return res.status(400).json({ error: 'An error occured' });
    }
    return res.json({ message: 'Course Has Been Deleted' });
  });
};

const updateCourse = (request, response) => {
  const req = request;
  const res = response;

  const data = req.body.newData;
  if (data._id) {
    delete data._id;
  }

  return Courses.CoursesModel.updateCourse(data._id, data, (err, doc) => {
    if (err) {
      return res.status(400).json({ error: 'Could Not Update Course' });
    }
    return res.status(204).json({ success: 'Course has been updated', doc });
  });
};

const getTerms = (req, res) => {
  Courses.CoursesModel.getTerms((err, terms) => {
    if (err || !terms) {
      return res.status(404).json({ error: 'No Terms Found' });
    }

    return res.json({ data: terms });
  });
};

const getSpecificCourses = (req, res) => {
  if (!req.query.id || !req.query.term) {
    return res.status(400).json({ error: 'Id and term are both required' });
  }
  return Courses.CoursesModel.getPerInstAndTerm(req.query.id,
    req.query.term, (err, docs) => {
      if (err || !docs) {
        return res.status(404).json({ error: 'No Courses Found' });
      }

      return res.json({ data: docs });
    });
};

module.exports = {
  getAllCourses,
  updateCourse,
  addCourse,
  deleteCourse,
  getTerms,
  getCoursesPerInstructorAndTerm: getSpecificCourses,
  upload,
};
