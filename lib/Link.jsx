"use client";

/**
 *
 * @param {import("react").ComponentProps<"a">} props
 */
export function Link(props) {
  const handleClick = (e) => {
    props.onClick?.(e);
    if (e.defaultPrevented) return;
    const current = new URL(window.location.href);
    const destination = new URL(props.href, current);
    if (current.origin !== destination.origin) return;
    e.preventDefault();
    const event = new CustomEvent("nanrsc.navigate", { detail: props.href });
    document.dispatchEvent(event);
  };

  return <a {...props} onClick={handleClick} />;
}
