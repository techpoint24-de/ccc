/**
 * Color Contrast Checker
 * An accessibility checker tool for validating the color contrast based on WCAG 2.0 standard.
 */

export type HexColor = `#${string}`;

export interface RGB {
  r: number;
  g: number;
  b: number;
  toString(): string;
}

export interface ContrastCheckResult {
  WCAG_AA: boolean;
  WCAG_AAA: boolean;
  toString(): string;
}

export interface CustomContrastCheckResult {
  customRatio: boolean;
  toString(): string;
}

export interface ContrastPair {
  colorA: HexColor;
  colorB: HexColor;
  fontSize?: number;
}

function createRGB(r: number, g: number, b: number): RGB {
  return {
    r,
    g,
    b,
    toString() {
      return `<r: ${this.r} g: ${this.g} b: ${this.b} >`;
    },
  };
}

function createContrastResult(
  WCAG_AA: boolean,
  WCAG_AAA: boolean,
): ContrastCheckResult {
  return {
    WCAG_AA,
    WCAG_AAA,
    toString() {
      return `< WCAG-AA: ${this.WCAG_AA ? "pass" : "fail"} WCAG-AAA: ${
        this.WCAG_AAA ? "pass" : "fail"
      } >`;
    },
  };
}

function createCustomResult(customRatio: boolean): CustomContrastCheckResult {
  return {
    customRatio,
    toString() {
      return `< Custom Ratio: ${this.customRatio ? "pass" : "fail"}  >`;
    },
  };
}

export default class ColorContrastChecker {
  fontSize = 14;

  isValidSixDigitColorCode(hex: string): boolean {
    const regSixDigitColorcode = /^(#)?([0-9a-fA-F]{6})?$/;
    return regSixDigitColorcode.test(hex);
  }

  isValidThreeDigitColorCode(hex: string): boolean {
    const regThreeDigitColorcode = /^(#)?([0-9a-fA-F]{3})?$/;
    return regThreeDigitColorcode.test(hex);
  }

  isValidColorCode(hex: string): boolean {
    return (
      this.isValidSixDigitColorCode(hex) || this.isValidThreeDigitColorCode(hex)
    );
  }

  isValidRatio(ratio: unknown): ratio is number {
    return typeof ratio === "number" && Number.isFinite(ratio);
  }

  convertColorToSixDigit(hex: string): HexColor {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` as HexColor;
  }

  hexToLuminance(color: string): number {
    if (!this.isValidColorCode(color)) {
      throw new Error(`Invalid Color :${color}`);
    }

    if (this.isValidThreeDigitColorCode(color)) {
      color = this.convertColorToSixDigit(color);
    }

    const rgb = this.getRGBFromHex(color);
    const LRGB = this.calculateLRGB(rgb);
    return this.calculateLuminance(LRGB);
  }

  check(
    colorA: string,
    colorB: string,
    fontSize?: number,
  ): ContrastCheckResult | false;
  check(
    colorA: string,
    colorB: string,
    fontSize: number | undefined,
    customRatio: number,
  ): CustomContrastCheckResult | false;
  check(
    colorA: string,
    colorB: string,
    fontSize?: number,
    customRatio?: number,
  ): ContrastCheckResult | CustomContrastCheckResult | false {
    if (typeof fontSize !== "undefined") {
      this.fontSize = fontSize;
    }

    if (!colorA || !colorB) {
      return false;
    }

    const l1 = this.hexToLuminance(colorA); /* higher value */
    const l2 = this.hexToLuminance(colorB); /* lower value */
    const contrastRatio = this.getContrastRatio(l1, l2);

    if (typeof customRatio !== "undefined") {
      if (!this.isValidRatio(customRatio)) {
        return false;
      }
      return this.verifyCustomContrastRatio(contrastRatio, customRatio);
    }

    return this.verifyContrastRatio(contrastRatio);
  }

  checkPairs(
    pairs: readonly ContrastPair[],
    customRatio?: number,
  ): Array<ContrastCheckResult | CustomContrastCheckResult | false> {
    const results: Array<
      ContrastCheckResult | CustomContrastCheckResult | false
    > = [];

    for (const pair of pairs) {
      if (typeof pair.fontSize !== "undefined") {
        results.push(
          this.check(pair.colorA, pair.colorB, pair.fontSize, customRatio!),
        );
      } else {
        results.push(
          this.check(pair.colorA, pair.colorB, undefined, customRatio!),
        );
      }
    }

    return results;
  }

  calculateLuminance(lRGB: RGB): number {
    return 0.2126 * lRGB.r + 0.7152 * lRGB.g + 0.0722 * lRGB.b;
  }

  isLevelAA(colorA: string, colorB: string, fontSize?: number): boolean {
    const result = this.check(colorA, colorB, fontSize) as ContrastCheckResult;
    return result.WCAG_AA;
  }

  isLevelAAA(colorA: string, colorB: string, fontSize?: number): boolean {
    const result = this.check(colorA, colorB, fontSize) as ContrastCheckResult;
    return result.WCAG_AAA;
  }

  isLevelCustom(colorA: string, colorB: string, ratio: number): boolean {
    const result = this.check(
      colorA,
      colorB,
      undefined,
      ratio,
    ) as CustomContrastCheckResult;
    return result.customRatio;
  }

  getRGBFromHex(color: string): RGB {
    if (typeof color !== "string") {
      throw new Error("must use string");
    }

    const rVal = Number.parseInt(color.slice(1, 3), 16);
    const gVal = Number.parseInt(color.slice(3, 5), 16);
    const bVal = Number.parseInt(color.slice(5, 7), 16);

    return createRGB(rVal, gVal, bVal);
  }

  calculateSRGB(rgb: RGB): RGB {
    return createRGB(rgb.r / 255, rgb.g / 255, rgb.b / 255);
  }

  calculateLRGB(rgb: RGB): RGB {
    const sRGB = this.calculateSRGB(rgb);

    const toLinear = (val: number) => {
      if (val <= 0.03928) return val / 12.92;
      return Math.pow((val + 0.055) / 1.055, 2.4);
    };

    return createRGB(toLinear(sRGB.r), toLinear(sRGB.g), toLinear(sRGB.b));
  }

  getContrastRatio(lumA: number, lumB: number): number {
    const lighter = lumA >= lumB ? lumA : lumB;
    const darker = lumA >= lumB ? lumB : lumA;
    return (lighter + 0.05) / (darker + 0.05);
  }

  verifyContrastRatio(ratio: number): ContrastCheckResult {
    const WCAG_REQ_RATIO_AA_LG = 3.0;
    const WCAG_REQ_RATIO_AA_SM = 4.5;
    const WCAG_REQ_RATIO_AAA_LG = 4.5;
    const WCAG_REQ_RATIO_AAA_SM = 7.0;
    const WCAG_FONT_CUTOFF = 18;

    const fontSize = this.fontSize || 14;

    if (fontSize >= WCAG_FONT_CUTOFF) {
      return createContrastResult(
        ratio >= WCAG_REQ_RATIO_AA_LG,
        ratio >= WCAG_REQ_RATIO_AAA_LG,
      );
    }

    return createContrastResult(
      ratio >= WCAG_REQ_RATIO_AA_SM,
      ratio >= WCAG_REQ_RATIO_AAA_SM,
    );
  }

  verifyCustomContrastRatio(
    inputRatio: number,
    checkRatio: number,
  ): CustomContrastCheckResult {
    return createCustomResult(inputRatio >= checkRatio);
  }
}

function normalizeHexColor(input: string, ccc: ColorContrastChecker): HexColor {
  if (!ccc.isValidColorCode(input)) {
    throw new Error(`Invalid Color :${input}`);
  }

  if (ccc.isValidThreeDigitColorCode(input)) {
    return ccc.convertColorToSixDigit(input);
  }

  return input as HexColor;
}

/**
 * Returns a high-contrast color (black or white) that best matches the given color.
 * Useful for picking readable text/icon colors on top of an arbitrary background.
 */
export function generateMatchingContrastColor(color: string): HexColor {
  const ccc = new ColorContrastChecker();
  const background = normalizeHexColor(color, ccc);

  const black = "#000000" as HexColor;
  const white = "#ffffff" as HexColor;

  const lumBg = ccc.hexToLuminance(background);
  const lumBlack = ccc.hexToLuminance(black);
  const lumWhite = ccc.hexToLuminance(white);

  const contrastWithBlack = ccc.getContrastRatio(lumBg, lumBlack);
  const contrastWithWhite = ccc.getContrastRatio(lumBg, lumWhite);

  return contrastWithBlack >= contrastWithWhite ? black : white;
}
