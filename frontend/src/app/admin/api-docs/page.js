import { redirect } from 'next/navigation';

export default function ApiDocsPage() {
  // Instantly redirects the browser to your static HTML file
  redirect('/document.html');
}