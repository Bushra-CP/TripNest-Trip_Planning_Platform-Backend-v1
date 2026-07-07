export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    //Object.setPrototypeOf(this, AppError.prototype) sets the prototype of the current object to AppError, ensuring that instanceof
    // AppError returns true and the custom error behaves correctly.
  }
}
