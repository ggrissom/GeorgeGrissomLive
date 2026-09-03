import {NextRequest,NextResponse} from "next/server";
export function middleware(request:NextRequest){
  if(request.nextUrl.hostname==="bim.georgegrissom.com"&&request.nextUrl.pathname==="/"){
    const target=request.nextUrl.clone();target.pathname="/bim";return NextResponse.rewrite(target);
  }
  return NextResponse.next();
}
export const config={matcher:["/"]};
