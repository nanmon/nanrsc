import { isValidElement, type ReactElement, type ReactNode } from "react";

interface OperationMap {
  primitive: (
    jsx: string | number | boolean | null | undefined,
    next: (jsx: ReactNode) => Promise<ReactNode>
  ) => Promise<ReactNode>;
  array: (
    jsx: any[],
    next: (jsx: ReactNode) => Promise<ReactNode>
  ) => Promise<ReactNode>;
  props: (
    jsx: object,
    next: (jsx: ReactNode) => Promise<ReactNode>
  ) => Promise<ReactNode>;
  native: (
    jsx: ReactElement,
    next: (jsx: ReactNode) => Promise<ReactNode>
  ) => Promise<ReactNode>;
  server: (
    jsx: ReactElement,
    next: (jsx: ReactNode) => Promise<ReactNode>
  ) => Promise<ReactNode>;
  client: (
    jsx: ReactElement,
    next: (jsx: ReactNode) => Promise<ReactNode>
  ) => Promise<ReactNode>;
}

export const defaultOperations: OperationMap = {
  primitive: async (jsx) => jsx,
  array: (jsx, next) => Promise.all(jsx.map((child) => next(child))),
  props: async (jsx, next) =>
    Object.fromEntries(
      await Promise.all(
        Object.entries(jsx).map(async ([propName, value]) => [
          propName,
          await next(value),
        ])
      )
    ),
  native: async (jsx, next) => ({
    ...jsx,
    props: await next(jsx.props),
  }),
  server: async (jsx, next) => {
    const returnedJsx = await (jsx.type as any)(jsx.props);
    return next(returnedJsx);
  },
  client: async (jsx, next) => ({
    ...jsx,
    props: await next(jsx.props),
  }),
};

export async function crawl(
  jsx: ReactNode,
  operationMap: Partial<OperationMap> = {}
): Promise<ReactNode> {
  const operations = {
    ...defaultOperations,
    ...operationMap,
  };
  const next = (jsx: ReactNode) => crawl(jsx, operations);
  switch (true) {
    case typeof jsx === "string":
    case typeof jsx === "number":
    case typeof jsx === "boolean":
    case jsx === null:
    case jsx === undefined:
      return operations.primitive(jsx, next);

    case Array.isArray(jsx):
      return operations.array(jsx, next);

    case jsx != null && "type" in jsx:
      if (typeof jsx.type === "string") {
        return operations.native(jsx, next);
      }
      if (typeof jsx.type === "function") {
        const Component = jsx.type as any;
        if (Component.$$typeof !== Symbol.for("react.client.reference")) {
          return operations.server(jsx, next);
        }
        return operations.client(jsx, next);
      }
      throw new Error("not implemented.");

    case jsx != null && typeof jsx === "object":
      return operations.props(jsx, next);

    case typeof jsx === "function":
      throw new Error("functions are not serializable");

    default:
      throw new Error("not implemented");
  }
}
