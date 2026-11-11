import s from "./animated-oyster.module.css";

/** Horizontal Pacific oyster: left umbo, layered lid and deep lower valve. */
export function OysterArtwork({ id }: { id: string }) {
  const paint = (name: string) => `url(#${id}-${name})`;
  return <>
    <defs>
      <linearGradient id={`${id}-shell`} x1="250" y1="210" x2="300" y2="273" gradientUnits="userSpaceOnUse">
        <stop stopColor="#b3b1a1"/><stop offset=".35" stopColor="#7d8277"/>
        <stop offset=".7" stopColor="#566367"/><stop offset="1" stopColor="#303e43"/>
      </linearGradient>
      <linearGradient id={`${id}-rim`} x1="280" y1="243" x2="300" y2="310" gradientUnits="userSpaceOnUse">
        <stop stopColor="#d8d5c5"/><stop offset=".45" stopColor="#a3a294"/><stop offset="1" stopColor="#485659"/>
      </linearGradient>
      <linearGradient id={`${id}-cup`} x1="290" y1="233" x2="300" y2="283" gradientUnits="userSpaceOnUse">
        <stop stopColor="#9ca9a3"/><stop offset=".5" stopColor="#edede1"/><stop offset="1" stopColor="#c8cec3"/>
      </linearGradient>
      <linearGradient id={`${id}-flesh`} x1="280" y1="233" x2="290" y2="270" gradientUnits="userSpaceOnUse">
        <stop stopColor="#83958e"/><stop offset=".4" stopColor="#c3ccc5"/>
        <stop offset=".7" stopColor="#e2e5d9"/><stop offset="1" stopColor="#9eafa6"/>
      </linearGradient>
    </defs>
    <g data-part="half-shell">
      <path d="M150 246Q176 231 214 231C275 224 353 222 410 235L427 234 431 244 445 246 441 257 450 266 439 276 439 287 422 289 415 301 395 299 380 308 363 304 344 312 325 307 305 313 286 306 267 310 249 301 230 302 214 291C185 284 162 265 150 246Z" fill={paint("rim")}/>
      <path d="M154 246C217 225 343 224 410 240L431 249 435 262 421 276C352 296 218 286 154 246Z" fill={paint("cup")}/>
      <path data-part="mantle" d="M164 245C220 230 336 229 399 240L421 249 419 260C355 280 230 273 164 245Z" fill="#414f4b"/>
      <path data-part="flesh" d="M170 246C211 238 239 241 264 237C301 230 319 241 348 239C378 236 402 244 414 251C399 266 368 266 343 268C308 272 291 261 265 265C228 267 195 257 170 246Z" fill={paint("flesh")}/>
      <path d="M203 246C232 244 245 257 275 253S319 246 345 253 382 258 398 252M279 240C295 237 312 242 320 247" stroke="#edf0e5" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round"/>
      <path d="M211 251C230 258 243 260 261 257M325 262C351 266 372 263 383 260" stroke="#72877c" strokeWidth="1.3"/>
      <path d="M171 262C232 294 357 304 423 278M190 278C248 304 341 310 400 292M220 292l8-7m31 18 9-7m30 11 7-7m31 5 7-9m26 5 10-10m25 3 8-11" stroke="#d4d2c1" strokeOpacity=".55" strokeWidth="2"/>
      <path d="M177 260C235 282 354 291 420 270" stroke="#f0eee2" strokeOpacity=".7" strokeWidth="2"/>
    </g>
    {/* Closed geometry covers the flesh; all opening is rotation about (154,246). */}
    <g className={s.lid} data-part="outer-shell">
      <g className={s.lidBreath}>
        <path d="M150 246Q158 232 183 234L202 226 219 229 235 219 255 224 276 214 296 219 319 211 337 216 359 212 376 219 395 217 407 228 424 225 427 237 440 239 436 250 447 258 434 270 418 267 405 274 385 269 367 275 346 270 324 274 302 267 280 270 261 262 239 264 223 256 204 258C180 252 166 252 150 246Z" fill={paint("shell")}/>
        <path d="M163 243C221 221 346 218 409 237L426 245 421 254 432 260 416 261 404 267 385 262 369 268 347 263 326 268 304 261 283 265 262 257 241 260 223 251 204 253Z" stroke="#d1cebd" strokeOpacity=".65" strokeWidth="2"/>
        <path d="M180 240C236 221 340 223 397 239L411 247 404 253 389 250 372 259 352 254 332 260 311 252 292 257 271 250 252 252 233 245 213 247Z" stroke="#35474a" strokeOpacity=".85" strokeWidth="3"/>
        <path d="M202 238C249 225 325 226 377 240L389 246 373 251 352 246 331 252 311 245 291 250 273 243 252 247 234 240Z" stroke="#c0bdab" strokeOpacity=".65" strokeWidth="2"/>
        <path d="M231 236C267 228 313 230 350 239L365 244 346 243 329 246 310 239 291 244 274 237 254 241Z" stroke="#425356" strokeWidth="2"/>
        <path d="m197 232 6 8 14-1m31-17 6 11 15-2m28-14 5 13 16-2m37-11 4 13 15-1m28 1-4 10 13 5m22 6-9 5 6 6m-59 9 3-8-12-3m-44 9 5-8-14-3m-51 6 4-8-13-3" stroke="#d4d0bd" strokeOpacity=".55" strokeWidth="1.4"/>
        <path d="m218 235 12 7m45-10 11 5m35-10 12 6m36 3 9 7m-29 9 8 6m-58-7 9 7m-72-12 10 6" stroke="#34484a" strokeWidth="1.2"/>
      </g>
    </g>
    <path d="M149 246q8-10 18-5l6 9-15 4Z" fill="#7e8276" stroke="#c0bdab" strokeWidth="1.4"/>
  </>;
}
