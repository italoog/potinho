import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Protege /conta/pedidos/** (7.3 AC1) e /admin/** (9.1 AC1) — UX only: cada
 * query/action ainda filtra por userId/role no servidor, essa é a defesa real
 * (nunca confiar só nisso). O checkout de role admin (404 pra não-admin) vive
 * no layout do admin, que precisa consultar o banco; aqui só barra quem nem
 * sessão tem. /conta em si fica de fora do matcher: gerencia login vs. lista
 * logada sozinha.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/conta", request.url));
  }
}

export const config = {
  matcher: ["/conta/pedidos/:path*", "/admin/:path*"],
};
