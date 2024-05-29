"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "new",
    salary: 100000,
    equity: 0.1,
    companyHandle: "c1",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual({
        id: job.id,
        title: "new",
        salary: 100000,
        equity: "0.1",
        companyHandle: "c1",
    });

    const result = await db.query(
          `SELECT title, salary, equity, company_handle
           FROM jobs
           WHERE title = 'new'`);
    expect(result.rows).toEqual([
      {
        title: "new",
        salary: 100000,
        equity: "0.1",
        company_handle: "c1",
      },
    ]);
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: 1,
        title: "j1",
        salary: 100000,
        equity: "0.1",
        companyHandle: "c1",
      },
      {
        id: 2,
        title: "j2",
        salary: 200000,
        equity: "0.2",
        companyHandle: "c1",
      },
      {
        id: 3,
        title: "j3",
        salary: 300000,
        equity: "0.3",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: one filter", async function () {
    let jobs = await Job.findAll({title : "1"});
    expect(jobs).toEqual([
      {
        id: 1,
        title: "j1",
        salary: 100000,
        equity: "0.1",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: two filters", async function () {
    let jobs = await Job.findAll({minSalary : 200000, hasEquity : true});
    expect(jobs).toEqual([
      {
        id: 2,
        title: "j2",
        salary: 200000,
        equity: "0.2",
        companyHandle: "c1",
      },
      {
        id: 3,
        title: "j3",
        salary: 300000,
        equity: "0.3",
        companyHandle: "c1",
      }
    ]);
  });

  test("fails with bad datatype", async function () {
    try {
      await Job.findAll({title : 1});
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get(1);
    expect(job).toEqual({
        id: 1,
        title: "j1",
        salary: 100000,
        equity: "0.1",
        company: {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
        },
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(9999);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "new",
    salary: 1000000,
    equity: 0.5,
  };

  test("works", async function () {
    let job = await Job.update(1, updateData);
    expect(job).toEqual({
        id: 1,
        title: "new",
        salary: 1000000,
        equity: "0.5",
        companyHandle: "c1",
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = 1`);
    expect(result.rows).toEqual([{
        id: 1,
        title: "new",
        salary: 1000000,
        equity: "0.5",
        company_handle: "c1",
    }]);
  });

  test("works: partial update", async function () {
    let job = await Job.update(1, {title : "new"});
    expect(job).toEqual({
        id: 1,
        title: "new",
        salary: 100000,
        equity: "0.1",
        companyHandle: "c1",
    })
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
        title: "new",
        salary: null,
        equity: null,
    };

    let job = await Job.update(1, updateDataSetNulls);
    expect(job).toEqual({
      id: 1,
      companyHandle: "c1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
        `SELECT id, title, salary, equity, company_handle
         FROM jobs
         WHERE id = 1`);
    expect(result.rows).toEqual([{
        id: 1,
        title: "new",
        salary: null,
        equity: null,
        company_handle: "c1",
    }]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(9999, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(1, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove(1);
    const res = await db.query(
        "SELECT id FROM jobs WHERE id=1");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(9999);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
