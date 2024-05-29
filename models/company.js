"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Can filter on provided search filters:
   * - minEmployees
   * - maxEmployees
   * - nameLike (will find case-insensitive, partial matches)
   * 
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(filters={}) {
    const filterConditionsArr = [];
    const values = [];
    let filterConditions = "";
    let counter = 1;
    let minEmployees = false;
    let maxEmployees = false;
    let nameLike = false;

    // Checks content of filters
    if (Object.keys(filters).includes("minEmployees")) {
      minEmployees = filters.minEmployees;
    }
    if (Object.keys(filters).includes("maxEmployees")) {
      maxEmployees = filters.maxEmployees;
    }
    if (Object.keys(filters).includes("nameLike")) {
      nameLike = filters.nameLike;
    }

    // constructs query and throws error if filter has bad datatype
    if (Number.isInteger(minEmployees)) {
      filterConditionsArr.push(`num_employees >= $${counter}`);
      values.push(minEmployees);
      counter++;
    } else if (minEmployees != false) {
      throw new BadRequestError("minEmployees must be an integer")
    }
    if (Number.isInteger(maxEmployees)) {
      filterConditionsArr.push(`num_employees <= $${counter}`);
      values.push(maxEmployees);
      counter++;
    } else if (maxEmployees != false) {
      throw new BadRequestError("maxEmployees must be an integer")
    }
    if (typeof nameLike === "string") {
      filterConditionsArr.push(`name ILIKE $${counter}`);
      values.push("%" + nameLike + "%");
      counter++;
    } else if (nameLike != false) {
      throw new BadRequestError("nameLike must be a string")
    }
    if (filterConditionsArr.length != 0) {
      filterConditions = "WHERE " + filterConditionsArr.join(" AND ");
    }

    // query database for companies
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ${filterConditions}
           ORDER BY name`, values);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT 
              c.handle,
              c.name,
              c.description,
              c.num_employees AS "numEmployees",
              c.logo_url AS "logoUrl",
              COALESCE(
                  json_agg(
                      json_build_object(
                          'id', j.id,
                          'title', j.title,
                          'salary', j.salary,
                          'equity', j.equity,
                          'companyHandle', j.company_handle
                      )
                  ) FILTER (WHERE j.id IS NOT NULL), '[]') AS jobs
            FROM 
                companies c
            LEFT JOIN 
                jobs j ON c.handle = j.company_handle
            WHERE c.handle = $1
            GROUP BY c.handle`,
          [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
