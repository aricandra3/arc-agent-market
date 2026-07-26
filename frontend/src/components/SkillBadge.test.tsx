import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkillBadge } from "@/components/SkillBadge";

describe("SkillBadge", () => {
  it("renders the skill label", () => {
    render(<SkillBadge skill="blockchain" />);
    expect(screen.getByText("blockchain")).toBeInTheDocument();
  });

  it("derives a stable colour for the same skill", () => {
    const { container: a } = render(<SkillBadge skill="design" />);
    const { container: b } = render(<SkillBadge skill="design" />);
    expect((a.firstChild as HTMLElement).getAttribute("style")).toBe(
      (b.firstChild as HTMLElement).getAttribute("style"),
    );
  });

  it("derives different colours for different skills", () => {
    const { container: a } = render(<SkillBadge skill="design" />);
    const { container: b } = render(<SkillBadge skill="security" />);
    expect((a.firstChild as HTMLElement).getAttribute("style")).not.toBe(
      (b.firstChild as HTMLElement).getAttribute("style"),
    );
  });
});
