import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Protege /conta/pedidos/** (7.3 AC1) — UX only: cada query ainda filtra por
 * userId da sessão no servidor, essa é a defesa real (nunca confiar só nisso).
 * /conta em si fica de fora do matcher: gerencia login vs. lista logada sozinha.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/conta", request.url));
  }
}

export const config = {
  matcher: ["/conta/pedidos/:path*"],
};
