"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new company data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const result = await db.query(
          `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
        [title, salary, equity, companyHandle],
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Can filter on provided search filters:
   * - title (will find case-insensitive, partial matches)
   * - minSalary
   * - hasEquity
   * 
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */

  static async findAll(filters={}) {
    const filterConditionsArr = [];
    const values = [];
    let filterConditions = "";
    let counter = 1;
    let title = false;
    let minSalary = false;
    let hasEquity = false;

    // Checks content of filters
    if (Object.keys(filters).includes("title")) {
        title = filters.title;
    }
    if (Object.keys(filters).includes("minSalary")) {
        minSalary = filters.minSalary;
    }
    if (Object.keys(filters).includes("hasEquity")) {
        hasEquity = filters.hasEquity;
    }

    // constructs query and throws error if filter has bad datatype
    if (typeof title === "string") {
        filterConditionsArr.push(`title ILIKE $${counter}`);
        values.push("%" + title + "%");
        counter++;
      } else if (title != false) {
        throw new BadRequestError("title must be a string")
      }
    if (Number.isInteger(minSalary)) {
      filterConditionsArr.push(`salary >= $${counter}`);
      values.push(minSalary);
      counter++;
    } else if (minSalary != false) {
      throw new BadRequestError("minSalary must be an integer")
    }
    if (hasEquity === true) {
      filterConditionsArr.push(`equity > 0`);
      counter++;
    } else if (hasEquity != false) {
      throw new BadRequestError("hasEquity must be a boolean")
    }
    if (filterConditionsArr.length != 0) {
      filterConditions = "WHERE " + filterConditionsArr.join(" AND ");
    }

    // query database for companies
    const jobsRes = await db.query(
          `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           ${filterConditions}`, values);
    return jobsRes.rows;
  }

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, company }
   *   where company is { handle, name, description, numEmployees, logoUrl }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
          `SELECT 
                j.id,
                j.title,
                j.salary,
                j.equity,
                json_build_object(
                    'handle', c.handle,
                    'name', c.name,
                    'description', c.description,
                    'numEmployees', c.num_employees,
                    'logoUrl', c.logo_url
                ) AS company
            FROM 
                jobs j
            JOIN 
                companies c ON j.company_handle = c.handle
            WHERE j.id = $1`,
            [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          title: "title",
          salary: "salary",
          equity : "equity",
        });
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
        [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}


module.exports = Job;
