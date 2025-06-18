const { errorResponse } = require('../utils/responseFormatter');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  return errorResponse(res, "Unhandled server error", [{ msg: err.message }], 500);
};

module.exports = errorHandler;
