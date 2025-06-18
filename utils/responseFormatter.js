exports.successResponse = (res, message = "Success", data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

exports.errorResponse = (res, message = "Something went wrong", errors = [], statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};
