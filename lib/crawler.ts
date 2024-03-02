import type { ReactElement, ReactNode } from "react";

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
  suspense: (
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
  server: async (jsx, next) => defaultOperations.native(jsx, next),
  client: async (jsx, next) => defaultOperations.native(jsx, next),
  suspense: async (jsx, next) => defaultOperations.native(jsx, next),
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

    case jsx != null && typeof jsx === "object" && "type" in jsx:
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
      if (jsx.type === Symbol.for("react.suspense")) {
        return operations.suspense(jsx, next);
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

export async function resolveAsyncComponent(
  jsx: ReactElement,
  next: (jsx: ReactNode) => Promise<ReactNode>
): Promise<ReactNode> {
  const returnedJsx = await (jsx.type as any)(jsx.props);
  return next(returnedJsx);
}

export async function serializeClientComponent(
  jsx: ReactElement,
  next: (jsx: ReactNode) => Promise<ReactNode>
): Promise<ReactNode> {
  return {
    ...jsx,
    type: (jsx.type as any).$$id,
    props: await next(jsx.props),
  };
}

export async function serializeSuspense(
  jsx: ReactElement,
  next: (jsx: ReactNode) => Promise<ReactNode>
): Promise<ReactNode> {
  return {
    ...jsx,
    type: jsx.type.toString().toLowerCase(),
    props: await next(jsx.props),
  };
}

export async function deserialize(
  jsx: ReactElement,
  next: (jsx: ReactNode) => Promise<ReactNode>
): Promise<ReactNode> {
  if (jsx.type.toString() === "symbol(react.suspense)") {
    return {
      ...((await defaultOperations.native(jsx, next)) as ReactElement),
      type: Symbol.for("react.suspense"),
      $$typeof: Symbol.for("react.element"),
    } as unknown as ReactElement;
  }
  if (!jsx.type.toString().includes("#"))
    return {
      ...((await defaultOperations.native(jsx, next)) as ReactElement),
      $$typeof: Symbol.for("react.element"),
    } as ReactElement;
  const [file, importKey] = jsx.type.toString().split("#");
  const Component = (await import(file))[importKey];
  return {
    ...jsx,
    $$typeof: Symbol.for("react.element"),
    type: Component,
    props: await next(jsx.props),
  } as ReactNode;
}
