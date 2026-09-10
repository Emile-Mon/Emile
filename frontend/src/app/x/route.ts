import { redirect } from 'next/navigation';

export async function GET() {
  redirect('https://x.com/emilelearns?s=11');
}
