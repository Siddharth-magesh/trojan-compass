// 404 page in the app's voice.
import { Link } from 'wouter';
import { Compass } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="mx-auto grid min-h-full max-w-md content-center justify-items-center px-6 py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-cardinal-soft text-primary"><Compass className="h-6 w-6" /></span>
      <h1 className="mt-5 font-serif text-[34px] leading-tight">Off the map</h1>
      <p className="mt-2 text-[13.5px] text-muted-foreground">This page doesn't exist. Let's get you back to somewhere familiar.</p>
      <Link href="/" className="mt-6 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground">Back to home</Link>
    </div>
  );
}
