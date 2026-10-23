import { S, T } from '../state';
import { footer, langBtn } from '../ui/parts';
import { esc } from '../ui/dom';

// Whoever runs this copy of Let's Meet sets their contact address in .env (Google's review asks for one).
const CONTACT: string = import.meta.env.VITE_CONTACT_EMAIL || '';

const page = (h: string, lead: string, extra = '') => `
  <header class="hdr"><div><div class="cap">Let's Meet</div></div>${langBtn()}</header>
  <div class="page-msg"><h1 class="large">${h}</h1><p class="sub">${lead}</p>${extra}</div>${footer()}`;

export const vLoading = () => `<div class="loading"><span class="spin"></span></div>`;
export const vNotFound = () => page(T().notFoundH, T().notFoundLead, `<a class="cta" href="/" data-link>${T().makeNew}</a>`);
export const vBadLink = () => page(T().badLinkH, T().badLinkLead, `<a class="cta" href="/" data-link>${T().makeNew}</a>`);
export const vError = () => page(T().loadFailed, '', `<button class="cta" data-act="retry">${T().retry}</button>`);

/** Plain-language privacy page (also the page Google's OAuth review asks for). */
export function vPrivacy(): string {
  const ja = S.lang === 'ja';
  const body = ja ? `
    <h1 class="large">プライバシー</h1>
    <p>Let’s Meet は、友達どうしで空いている日を見つけるためのサービスです。分析や広告のためにデータを集めることはしません。</p>
    <h2>Googleカレンダーから読み取るもの</h2>
    <ul><li>候補期間内の「予定が入っている時間帯」だけです（Googleの <code>calendar.freebusy</code> 権限）。</li>
    <li>予定のタイトル・場所・メモ・参加者、Gmail、メールアドレスは読み取りません。そもそもその権限を求めません。</li>
    <li>読み取りはあなたのブラウザの中だけで行い、終わったらすぐに権限を取り消します。Googleのデータやアクセス権が当社のサーバーに送られることはありません。</li></ul>
    <h2>保存するもの</h2>
    <ul><li>予定のタイトル・候補期間・カバー画像の種類。</li>
    <li>各メンバーの名前と空き状況。これはリンクに含まれる鍵で暗号化してから保存するので、当社のサーバーでは中身を読めません。</li>
    <li>主催者や回答者が自分のデータを変更するための合言葉は、ハッシュ化して保存します。</li>
    <li>アクセスログ・IPアドレス・Cookie・広告タグは使いません。</li></ul>
    <h2>削除のタイミング</h2>
    <ul><li>作成から7日で、すべてのデータを自動で削除します。</li>
    <li>日程が決まった時点で、全員の空き状況は即座に削除されます。タイトルと決定日時だけが予定日の翌日まで残り、その後削除されます。</li>
    <li>主催者はいつでも今すぐ削除できます。</li></ul>
    <h2>Googleのユーザーデータの扱い</h2>
    <p>Google APIから受け取った情報の利用と第三者への移転は、Google API Services User Data Policy（Limited Use の要件を含む）に従います。</p>`
  : `
    <h1 class="large">Privacy</h1>
    <p>Let’s Meet helps friends find days they’re all free. It does not collect data for analytics or advertising.</p>
    <h2>What we read from Google Calendar</h2>
    <ul><li>Only the times you’re busy, within the plan’s dates (Google’s <code>calendar.freebusy</code> permission).</li>
    <li>We never read event titles, places, notes, guests, Gmail or your email address. We don’t even ask for that permission.</li>
    <li>The read happens inside your browser, and the permission is revoked as soon as it finishes. No Google data or access is ever sent to our server.</li></ul>
    <h2>What we store</h2>
    <ul><li>The plan’s title, dates and cover style.</li>
    <li>Each person’s name and free/busy answers, encrypted in the browser with the key in the link. Our server can’t read them.</li>
    <li>Hashes of the secrets that let the organizer and each person change their own data.</li>
    <li>No access logs, IP addresses, cookies or ad trackers.</li></ul>
    <h2>When it’s deleted</h2>
    <ul><li>Everything is deleted automatically 7 days after a plan is created.</li>
    <li>When a date is picked, everyone’s availability is deleted right away. Only the title and date stay, until the day after the event.</li>
    <li>The organizer can delete a plan at any time.</li></ul>
    <h2>Google user data</h2>
    <p>Let’s Meet’s use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.</p>`;
  const contact = CONTACT ? `<h2>${ja ? 'お問い合わせ' : 'Contact'}</h2><p>${esc(CONTACT)}</p>` : '';
  return `<header class="hdr"><div><a class="cap" href="/" data-link>Let's Meet</a></div>${langBtn()}</header><article class="prose">${body}${contact}</article>`;
}
