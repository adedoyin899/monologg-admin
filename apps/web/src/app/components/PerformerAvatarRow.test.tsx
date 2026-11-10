import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import { PerformerAvatarRow } from "./PerformerAvatarRow";

const EXPECTED_PERFORMERS = [
  { name: "Theo", fullName: "Theo Olayanju", avatarHash: "6012d1b6" },
  { name: "Olayinka", fullName: "Olayinka Olaseni", avatarHash: "7e479fe9" },
  { name: "Deborah", fullName: "Deborah Ojengbede", avatarHash: "ce412497" },
  { name: "Bolu", fullName: "Bolu Olatunji", avatarHash: "27c7ee29" },
  { name: "Gloria", fullName: "Gloria Sido", avatarHash: "89a561d6" },
];

describe("PerformerAvatarRow", () => {
  it("renders all 5 performer avatars with alt text and data attributes", () => {
    render(<PerformerAvatarRow />);

    EXPECTED_PERFORMERS.forEach((performer, idx) => {
      const avatarBtn = screen.getByTestId(`performer-avatar-${idx}`);
      expect(avatarBtn).toBeInTheDocument();
      expect(avatarBtn).toHaveAttribute("aria-label", `Performer: ${performer.fullName}`);

      const img = screen.getByAltText(performer.fullName);
      expect(img).toBeInTheDocument();
      expect(img.getAttribute("src")).toContain(performer.avatarHash);
    });
  });

  it("keeps all performer names hidden in default idle state (opacity-0)", () => {
    render(<PerformerAvatarRow />);

    EXPECTED_PERFORMERS.forEach((performer, idx) => {
      const nameEl = screen.getByTestId(`performer-name-${idx}`);
      expect(nameEl).toHaveClass("opacity-0");
      expect(nameEl).toHaveTextContent(performer.name);
    });
  });

  it("reveals hovered performer name and blurs non-hovered avatars on mouse enter", () => {
    render(<PerformerAvatarRow />);

    const firstAvatar = screen.getByTestId("performer-avatar-0");
    fireEvent.mouseEnter(firstAvatar);

    // Name 0 (Theo) should be visible (opacity-100)
    const theoName = screen.getByTestId("performer-name-0");
    expect(theoName).toHaveClass("opacity-100");

    // Other names should remain hidden
    for (let i = 1; i < EXPECTED_PERFORMERS.length; i++) {
      expect(screen.getByTestId(`performer-name-${i}`)).toHaveClass("opacity-0");
    }

    // First avatar should be focused and unblurred
    expect(firstAvatar).toHaveClass("scale-[1.08]");
    expect(firstAvatar).not.toHaveClass("blur-[2px]");

    // Other avatars should be blurred and have reduced opacity
    for (let i = 1; i < EXPECTED_PERFORMERS.length; i++) {
      const otherAvatar = screen.getByTestId(`performer-avatar-${i}`);
      expect(otherAvatar).toHaveClass("blur-[2px]");
      expect(otherAvatar).toHaveClass("opacity-60");
    }
  });

  it("smoothly restores idle state (no blur, names hidden) when mouse leaves", () => {
    const { container } = render(<PerformerAvatarRow />);

    const firstAvatar = screen.getByTestId("performer-avatar-0");
    fireEvent.mouseEnter(firstAvatar);

    const outerWrapper = container.firstChild as HTMLElement;
    fireEvent.mouseLeave(outerWrapper);

    // All names back to opacity-0
    EXPECTED_PERFORMERS.forEach((_, idx) => {
      expect(screen.getByTestId(`performer-name-${idx}`)).toHaveClass("opacity-0");
    });

    // All avatars back to unblurred
    EXPECTED_PERFORMERS.forEach((_, idx) => {
      const avatar = screen.getByTestId(`performer-avatar-${idx}`);
      expect(avatar).not.toHaveClass("blur-[2px]");
      expect(avatar).toHaveClass("scale-100");
    });
  });

  it("supports keyboard focus and click toggle for accessibility", () => {
    render(<PerformerAvatarRow />);

    const secondAvatar = screen.getByTestId("performer-avatar-1");
    fireEvent.focus(secondAvatar);

    expect(screen.getByTestId("performer-name-1")).toHaveClass("opacity-100");
    expect(screen.getByTestId("performer-avatar-0")).toHaveClass("blur-[2px]");

    fireEvent.blur(secondAvatar);
    expect(screen.getByTestId("performer-name-1")).toHaveClass("opacity-0");
  });
});
