import { greet } from "./index";

describe("greet function", () => {
  it("should return greeting message with name", () => {
    const result = greet("dev-log");
    expect(result).toBe("Hello, dev-log!");
  });

  it("should work with empty string", () => {
    const result = greet("");
    expect(result).toBe("Hello, !");
  });
});
