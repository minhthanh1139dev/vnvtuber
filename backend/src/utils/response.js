const { StatusCodes, getReasonPhrase } = require("http-status-codes");

// ─── Success ────────────────────────────────────────────────────────────────

class SuccessResponse {
  constructor({ message, data, meta, statusCode = StatusCodes.OK }) {
    this.status = "success";
    this.code = statusCode;
    this.message = message || getReasonPhrase(statusCode);
    this.data = data ?? null;
    this.meta = meta ?? null;
  }

  send(res) {
    const body = {
      status: this.status,
      code: this.code,
      message: this.message,
      data: this.data,
    };
    if (this.meta) {
      body.meta = this.meta;
    }
    return res.status(this.code).json(body);
  }
}

class OK extends SuccessResponse {
  constructor(params = {}) {
    super({ ...params, statusCode: StatusCodes.OK });
  }
}

class CREATED extends SuccessResponse {
  constructor(params = {}) {
    super({ ...params, statusCode: StatusCodes.CREATED });
  }
}

// ─── Error ──────────────────────────────────────────────────────────────────

class ErrorResponse extends Error {
  constructor({
    message,
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
  } = {}) {
    super(message || getReasonPhrase(statusCode));
    this.statusCode = statusCode;
    this.code = statusCode;
  }

  send(res) {
    return res.status(this.statusCode).json({
      status: "error",
      code: this.statusCode,
      message: this.message,
    });
  }
}

class BAD_REQUEST extends ErrorResponse {
  constructor(params = {}) {
    super({ ...params, statusCode: StatusCodes.BAD_REQUEST });
  }
}

class UNAUTHORIZED extends ErrorResponse {
  constructor(params = {}) {
    super({ ...params, statusCode: StatusCodes.UNAUTHORIZED });
  }
}

class FORBIDDEN extends ErrorResponse {
  constructor(params = {}) {
    super({ ...params, statusCode: StatusCodes.FORBIDDEN });
  }
}

class NOT_FOUND extends ErrorResponse {
  constructor(params = {}) {
    super({ ...params, statusCode: StatusCodes.NOT_FOUND });
  }
}

class CONFLICT extends ErrorResponse {
  constructor(params = {}) {
    super({ ...params, statusCode: StatusCodes.CONFLICT });
  }
}

class UNPROCESSABLE_ENTITY extends ErrorResponse {
  constructor(params = {}) {
    super({ ...params, statusCode: StatusCodes.UNPROCESSABLE_ENTITY });
  }
}

class TOO_MANY_REQUESTS extends ErrorResponse {
  constructor(params = {}) {
    super({ ...params, statusCode: StatusCodes.TOO_MANY_REQUESTS });
  }
}

class SERVICE_UNAVAILABLE extends ErrorResponse {
  constructor(params = {}) {
    super({ ...params, statusCode: StatusCodes.SERVICE_UNAVAILABLE });
  }
}

class INTERNAL_SERVER_ERROR extends ErrorResponse {
  constructor(params = {}) {
    super({ ...params, statusCode: StatusCodes.INTERNAL_SERVER_ERROR });
  }
}

module.exports = {
  OK,
  CREATED,
  ErrorResponse,
  BAD_REQUEST,
  UNAUTHORIZED,
  FORBIDDEN,
  NOT_FOUND,
  CONFLICT,
  UNPROCESSABLE_ENTITY,
  TOO_MANY_REQUESTS,
  SERVICE_UNAVAILABLE,
  INTERNAL_SERVER_ERROR,
};
