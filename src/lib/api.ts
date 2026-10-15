import { NextResponse } from "next/server";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export type ApiOkBody<T> = {
  data: T;
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data } satisfies ApiOkBody<T>, {
    status: 200,
    ...init,
  });
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  init?: ResponseInit,
) {
  return NextResponse.json(
    { error: { code, message } } satisfies ApiErrorBody,
    { status, ...init },
  );
}
