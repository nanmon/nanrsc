import type { FC, ReactElement, ReactNode } from "react";
import React from "react";

export async function traverseJsx(jsx: ReactNode): Promise<ReactNode> {
  switch (true) {
    case typeof jsx === "string":
    case typeof jsx === "number":
    case typeof jsx === "boolean":
    case jsx == null:
      // Don't need to do anything special with these types.
      return jsx;

    case Array.isArray(jsx):
      // Process each item in an array.
      return Promise.all(jsx.map((child) => traverseJsx(child)));

    case React.isValidElement(jsx):
      if (typeof jsx.type === "string") {
        // This is a component like <div />.
        // Go over its props to make sure they can be turned into JSON.
        return {
          ...jsx,
          props: await traverseJsx(jsx.props),
        };
      }
      if (typeof jsx.type === "function") {
        return treatFunctionComponent(jsx);
      }
      throw new Error("not implemented.");

    case jsx != null && typeof jsx === "object":
      // This is an arbitrary object (for example, props, or something inside of them).
      // Go over every value inside, and process it too in case there's some JSX in it.
      return Object.fromEntries(
        await Promise.all(
          Object.entries(jsx).map(async ([propName, value]) => [
            propName,
            await traverseJsx(value),
          ])
        )
      );

    case typeof jsx === "function":
      throw new Error("functions are not serializable");

    default:
      throw new Error("not implemented");
  }
}

async function treatFunctionComponent(jsx: ReactElement) {
  // This is a custom React component (like <Footer />).
  // Call its function, and repeat the procedure for the JSX it returns.
  const Component = jsx.type as any;
  const props: object = jsx.props;

  console.log(jsx);
  if (Component.$$typeof !== Symbol.for("react.client.reference")) {
    // server component, unwrap
    const returnedJsx = await Component(props);
    return traverseJsx(returnedJsx);
  }

  return {
    ...jsx,
    // send component id to client jsx and find a way to get it in the bundle
    type: Component.$$id,
    // same as with <div/> elements, go over its props
    props: await traverseJsx(jsx.props),
  };
}
