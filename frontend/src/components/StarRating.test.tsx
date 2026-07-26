import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StarRating } from "@/components/StarRating";

describe("StarRating", () => {
  it("renders a read-only label when no handler is given", () => {
    render(<StarRating value={4} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("4 out of 5 stars");
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("exposes an interactive rating as a radio group", () => {
    render(<StarRating value={3} onChange={() => {}} />);
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "3 stars" })).toBeChecked();
  });

  it("reports the clicked rating", () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("moves the rating with arrow keys and clamps at both ends", () => {
    const onChange = vi.fn();
    const { rerender } = render(<StarRating value={5} onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole("radio", { name: "5 stars" }), {
      key: "ArrowRight",
    });
    expect(onChange).toHaveBeenLastCalledWith(5);

    rerender(<StarRating value={1} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("radio", { name: "1 star" }), {
      key: "ArrowLeft",
    });
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("steps up and down with arrow keys", () => {
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} />);
    const selected = screen.getByRole("radio", { name: "3 stars" });

    fireEvent.keyDown(selected, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(4);

    fireEvent.keyDown(selected, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it("is a single tab stop", () => {
    render(<StarRating value={3} onChange={() => {}} />);
    const tabbable = screen
      .getAllByRole("radio")
      .filter((star) => star.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
  });

  it("does not report changes while disabled", () => {
    const onChange = vi.fn();
    render(<StarRating value={2} onChange={onChange} disabled />);

    fireEvent.click(screen.getByRole("radio", { name: "5 stars" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
