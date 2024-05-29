const { BadRequestError } = require("../expressError");

/** Helps constructing a sql `UPDATE` query given partial data.
 * 
 * Input { param1 : value1, param2 : value2, ..., paramn : valuen }
 * 
 * Returns { setCols : "param1=$1, param2=$2, ..., paramn=$n",
 *           values : [value1, value2, ..., valuen]}
*/
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  // Gets keys
  const keys = Object.keys(dataToUpdate);

  // Throws error if dataToUpdate contains no data
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    // ['"first_name"=$1', '"age"=$2'] => '"first_name"=$1, "age"=$2'
    setCols: cols.join(", "),
    // Gets values
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
