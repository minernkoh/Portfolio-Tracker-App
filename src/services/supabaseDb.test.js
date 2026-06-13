import { describe, it, expect } from "vitest";
import { combineDateAndTime, parseDatetime } from "./supabaseDb";

describe("date/time conversion", () => {
  it("round-trips a date+time through UTC storage back to local fields", () => {
    // user enters a wall-clock date/time; it is stored as UTC and read back.
    // the displayed values must match what was entered, in any local timezone.
    const date = "2024-03-15";
    const time = "14:30";
    const iso = combineDateAndTime(date, time);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/); // valid ISO
    expect(parseDatetime(iso)).toEqual({ date, time });
  });

  it("round-trips a date near midnight without shifting the day", () => {
    const date = "2024-12-31";
    const time = "23:59";
    expect(parseDatetime(combineDateAndTime(date, time))).toEqual({ date, time });
  });

  it("returns the bare date when no time is supplied", () => {
    expect(combineDateAndTime("2024-03-15", "")).toBe("2024-03-15");
    expect(combineDateAndTime("2024-03-15")).toBe("2024-03-15");
  });

  it("returns null for an empty date", () => {
    expect(combineDateAndTime("", "10:00")).toBeNull();
    expect(combineDateAndTime(null)).toBeNull();
  });

  it("returns empty fields for empty input", () => {
    expect(parseDatetime("")).toEqual({ date: "", time: "" });
    expect(parseDatetime(null)).toEqual({ date: "", time: "" });
  });

  it("degrades gracefully on an unparseable value", () => {
    expect(parseDatetime("not-a-date")).toEqual({ date: "not-a-date", time: "" });
  });
});
