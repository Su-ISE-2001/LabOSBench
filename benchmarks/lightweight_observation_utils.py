import io
from typing import Callable

from PIL import Image


OBSERVATION_MODE_SCREENSHOT = "screenshot"
OBSERVATION_MODE_SCREENSHOT_720P = "screenshot_720p"
OBSERVATION_MODE_A11Y_TREE = "a11y_tree"

SUPPORTED_OBSERVATION_MODES = {
    OBSERVATION_MODE_SCREENSHOT,
    OBSERVATION_MODE_SCREENSHOT_720P,
    OBSERVATION_MODE_A11Y_TREE,
}

LEGACY_LINEARIZED_A11Y_HEADER = "tag\tname\ttext\tclass\tdescription\tposition (top-left x&y)\tsize (w&h)"
LINEARIZED_A11Y_HEADER = (
    "idx\tdepth\ttag\trole\tname\ttext\tvalue\tplaceholder\ttitle\taria_label\t"
    "description\tdisabled\tselected\tchecked\texpanded\tpressed\treadonly\t"
    "required\tinteractable\tposition (top-left x&y)\tsize (w&h)\tparent\tpath\tclass\tid"
)


def normalize_observation_mode(mode: str | None) -> str:
    normalized = (mode or OBSERVATION_MODE_SCREENSHOT).strip().lower()
    if normalized not in SUPPORTED_OBSERVATION_MODES:
        raise ValueError(
            f"Unsupported observation_mode: {mode}. "
            f"Expected one of {sorted(SUPPORTED_OBSERVATION_MODES)}"
        )
    return normalized


def resize_png_bytes(image_bytes: bytes, width: int = 1280, height: int = 720) -> bytes:
    if not image_bytes:
        return image_bytes
    image = Image.open(io.BytesIO(image_bytes))
    resized = image.resize((width, height), Image.Resampling.LANCZOS)
    output = io.BytesIO()
    resized.save(output, format="PNG")
    return output.getvalue()


def linearize_playwright_accessibility_tree_legacy(page) -> str:
    rows = page.evaluate(
        """
        () => {
            const selectors = [
              "button",
              "input",
              "select",
              "textarea",
              "a",
              "label",
              "canvas",
              "[role]",
              "[aria-label]",
              "[contenteditable='true']"
            ];
            const nodes = [];
            const seen = new Set();

            const isVisible = (el) => {
              if (!(el instanceof Element)) return false;
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              return (
                rect.width > 0 &&
                rect.height > 0 &&
                style.visibility !== "hidden" &&
                style.display !== "none"
              );
            };

            document.querySelectorAll(selectors.join(",")).forEach((el) => {
              if (!(el instanceof Element)) return;
              if (seen.has(el)) return;
              seen.add(el);
              if (!isVisible(el)) return;

              const rect = el.getBoundingClientRect();
              const tag = (el.getAttribute("role") || el.tagName || "node").toLowerCase();
              const name =
                el.getAttribute("aria-label") ||
                el.getAttribute("name") ||
                el.getAttribute("title") ||
                el.getAttribute("placeholder") ||
                "";

              let text = "";
              if (el.tagName === "SELECT") {
                const option = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
                text = option ? (option.textContent || "").trim() : "";
              } else if ("value" in el && typeof el.value === "string" && el.value.trim()) {
                text = el.value.trim();
              } else {
                text = (el.innerText || el.textContent || "").trim();
              }

              const className =
                typeof el.className === "string"
                  ? el.className
                  : (el.className && el.className.baseVal) || "";

              const description =
                el.getAttribute("aria-description") ||
                el.getAttribute("alt") ||
                el.getAttribute("aria-describedby") ||
                "";

              nodes.push({
                tag,
                name,
                text,
                className,
                description,
                position: [Math.round(rect.left), Math.round(rect.top)],
                size: [Math.round(rect.width), Math.round(rect.height)],
              });
            });

            return nodes;
        }
        """
    )

    def clean_text(value):
        text = str(value or "").replace("\t", " ").replace("\n", " ").strip()
        if '"' in text:
            return f'"{text.replace(chr(34), chr(34) * 2)}"'
        return text

    lines = [LEGACY_LINEARIZED_A11Y_HEADER]
    for row in rows or []:
        lines.append(
            "\t".join(
                [
                    clean_text(row.get("tag")),
                    clean_text(row.get("name")),
                    clean_text(row.get("text")),
                    clean_text(row.get("className")),
                    clean_text(row.get("description")),
                    str(tuple(row.get("position") or (-1, -1))),
                    str(tuple(row.get("size") or (-1, -1))),
                ]
            )
        )
    return "\n".join(lines)


def linearize_playwright_accessibility_tree(page) -> str:
    rows = page.evaluate(
        """
        () => {
            const SKIP_TAGS = new Set(["script", "style", "link", "meta", "noscript", "br"]);
            const INTERACTIVE_TAGS = new Set([
              "button", "input", "select", "textarea", "option", "a", "summary", "canvas"
            ]);
            const INTERACTIVE_ROLES = new Set([
              "button", "link", "checkbox", "radio", "switch", "tab", "textbox", "combobox",
              "listbox", "option", "menuitem", "menuitemcheckbox", "menuitemradio", "slider",
              "spinbutton"
            ]);
            const GENERIC_CONTAINER_TAGS = new Set(["div", "fieldset", "section", "article", "main", "aside", "nav"]);

            const normalizeText = (value) =>
              (value || "").replace(/\\s+/g, " ").trim();

            const isVisible = (el) => {
              if (!(el instanceof Element)) return false;
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              return (
                rect.width > 0 &&
                rect.height > 0 &&
                style.visibility !== "hidden" &&
                style.display !== "none" &&
                style.opacity !== "0"
              );
            };

            const hasMeaningfulText = (text) => normalizeText(text).length > 0;

            const cssPath = (el) => {
              const parts = [];
              let node = el;
              let guard = 0;
              while (node && node.nodeType === Node.ELEMENT_NODE && guard < 5) {
                const tag = node.tagName.toLowerCase();
                const id = node.id ? `#${node.id}` : "";
                let nth = "";
                if (!id && node.parentElement) {
                  const siblings = Array.from(node.parentElement.children).filter(
                    (child) => child.tagName === node.tagName
                  );
                  if (siblings.length > 1) {
                    nth = `:nth-of-type(${siblings.indexOf(node) + 1})`;
                  }
                }
                parts.unshift(`${tag}${id}${nth}`);
                node = node.parentElement;
                guard += 1;
              }
              return parts.join(" > ");
            };

            const getDepth = (el) => {
              let depth = 0;
              let node = el.parentElement;
              while (node && node !== document.body) {
                depth += 1;
                node = node.parentElement;
              }
              return depth;
            };

            const rows = [];
            const elements = Array.from(document.querySelectorAll("body *"));
            for (const el of elements) {
              if (!(el instanceof Element)) continue;
              const tag = el.tagName.toLowerCase();
              if (SKIP_TAGS.has(tag)) continue;
              if (!isVisible(el)) continue;

              const rect = el.getBoundingClientRect();
              const role = normalizeText(el.getAttribute("role"));
              const name = normalizeText(
                el.getAttribute("name") ||
                el.getAttribute("aria-label") ||
                el.getAttribute("title") ||
                el.getAttribute("placeholder")
              );
              const text =
                tag === "select"
                  ? normalizeText(el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex]?.textContent : "")
                  : normalizeText(("value" in el && typeof el.value === "string" && el.value) || el.innerText || el.textContent);
              const value = normalizeText(("value" in el && typeof el.value === "string" && el.value) || "");
              const placeholder = normalizeText(el.getAttribute("placeholder"));
              const title = normalizeText(el.getAttribute("title"));
              const ariaLabel = normalizeText(el.getAttribute("aria-label"));
              const description = normalizeText(
                el.getAttribute("aria-description") ||
                el.getAttribute("aria-describedby") ||
                el.getAttribute("alt")
              );
              const className = normalizeText(typeof el.className === "string" ? el.className : (el.className?.baseVal || ""));
              const id = normalizeText(el.id || "");
              const disabled =
                !!el.matches(":disabled") ||
                el.getAttribute("aria-disabled") === "true" ||
                className.includes("disabled");
              const selected =
                el.getAttribute("aria-selected") === "true" ||
                (!!el.selected);
              const checked =
                el.getAttribute("aria-checked") === "true" ||
                (!!el.checked);
              const expanded = el.getAttribute("aria-expanded");
              const pressed = el.getAttribute("aria-pressed");
              const readonly =
                el.getAttribute("aria-readonly") === "true" ||
                !!el.readOnly;
              const required =
                el.getAttribute("aria-required") === "true" ||
                !!el.required;
              const tabindex = el.getAttribute("tabindex");
              const interactable =
                !disabled &&
                (
                  INTERACTIVE_TAGS.has(tag) ||
                  INTERACTIVE_ROLES.has(role) ||
                  typeof el.onclick === "function" ||
                  (tabindex !== null && Number(tabindex) >= 0) ||
                  el.getAttribute("contenteditable") === "true"
                );
              const isHugeContainer =
                GENERIC_CONTAINER_TAGS.has(tag) &&
                rect.width >= 500 &&
                rect.height >= 200 &&
                text.length >= 120 &&
                !interactable &&
                !role &&
                !ariaLabel &&
                !description;

              const shouldInclude =
                !isHugeContainer &&
                (
                  interactable ||
                  disabled ||
                  selected ||
                  checked ||
                  expanded !== null ||
                  pressed !== null ||
                  readonly ||
                  required ||
                  role ||
                  ariaLabel ||
                  placeholder ||
                  title ||
                  description ||
                  hasMeaningfulText(text) ||
                  hasMeaningfulText(value) ||
                  tag === "canvas" ||
                  tag === "label"
                );

              if (!shouldInclude) continue;

              const parent = el.parentElement
                ? normalizeText(
                    el.parentElement.getAttribute("aria-label") ||
                    el.parentElement.getAttribute("name") ||
                    el.parentElement.textContent ||
                    el.parentElement.tagName
                  )
                : "";

              rows.push({
                depth: getDepth(el),
                tag,
                role,
                name,
                text,
                value,
                placeholder,
                title,
                ariaLabel,
                description,
                disabled,
                selected,
                checked,
                expanded: expanded === null ? "" : expanded,
                pressed: pressed === null ? "" : pressed,
                readonly,
                required,
                interactable,
                position: [Math.round(rect.left), Math.round(rect.top)],
                size: [Math.round(rect.width), Math.round(rect.height)],
                parent,
                path: cssPath(el),
                className,
                id,
              });
            }

            return rows;
        }
        """
    )

    def clean_text(value):
        text = str(value or "").replace("\t", " ").replace("\n", " ").strip()
        if '"' in text:
            return f'"{text.replace(chr(34), chr(34) * 2)}"'
        return text

    lines = [LINEARIZED_A11Y_HEADER]
    for idx, row in enumerate(rows or [], start=1):
        lines.append(
            "\t".join(
                [
                    str(idx),
                    str(row.get("depth", "")),
                    clean_text(row.get("tag")),
                    clean_text(row.get("role")),
                    clean_text(row.get("name")),
                    clean_text(row.get("text")),
                    clean_text(row.get("value")),
                    clean_text(row.get("placeholder")),
                    clean_text(row.get("title")),
                    clean_text(row.get("ariaLabel")),
                    clean_text(row.get("description")),
                    str(bool(row.get("disabled", False))).lower(),
                    str(bool(row.get("selected", False))).lower(),
                    str(bool(row.get("checked", False))).lower()
                    if isinstance(row.get("checked"), bool)
                    else clean_text(row.get("checked")),
                    clean_text(row.get("expanded")),
                    clean_text(row.get("pressed")),
                    str(bool(row.get("readonly", False))).lower(),
                    str(bool(row.get("required", False))).lower(),
                    str(bool(row.get("interactable", False))).lower(),
                    str(tuple(row.get("position") or (-1, -1))),
                    str(tuple(row.get("size") or (-1, -1))),
                    clean_text(row.get("parent")),
                    clean_text(row.get("path")),
                    clean_text(row.get("className")),
                    clean_text(row.get("id")),
                ]
            )
        )
    return "\n".join(lines)


def build_lightweight_observation(
    page,
    instruction: str,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
    mouse_pos=None,
    last_mouse_pos=None,
    annotate_mouse_fn: Callable[[bytes, int, int], bytes] | None = None,
):
    observation_mode = normalize_observation_mode(observation_mode)
    screenshot_bytes = None
    next_mouse_pos = last_mouse_pos

    if observation_mode in {
        OBSERVATION_MODE_SCREENSHOT,
        OBSERVATION_MODE_SCREENSHOT_720P,
    }:
        screenshot_bytes = page.screenshot(type="png", full_page=False)
        if mouse_pos and annotate_mouse_fn:
            screenshot_bytes = annotate_mouse_fn(screenshot_bytes, mouse_pos[0], mouse_pos[1])
            next_mouse_pos = mouse_pos
        elif last_mouse_pos and annotate_mouse_fn:
            screenshot_bytes = annotate_mouse_fn(
                screenshot_bytes, last_mouse_pos[0], last_mouse_pos[1]
            )

        if observation_mode == OBSERVATION_MODE_SCREENSHOT_720P:
            screenshot_bytes = resize_png_bytes(screenshot_bytes, width=1280, height=720)

    accessibility_tree = None
    if observation_mode == OBSERVATION_MODE_A11Y_TREE:
        accessibility_tree = linearize_playwright_accessibility_tree(page)

    observation = {
        "screenshot": screenshot_bytes,
        "accessibility_tree": accessibility_tree,
        "terminal": None,
        "instruction": instruction,
        "observation_mode": observation_mode,
    }
    return observation, next_mouse_pos
