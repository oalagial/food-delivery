import LegalDocumentPage from './LegalDocumentPage'
import privacyHtml from '../legal/privacy-policy.html?raw'
import cookiePolicyHtml from '../legal/cookie-policy.html?raw'
import termsHtml from '../legal/terms-and-conditions.html?raw'

export function PrivacyPolicyPage() {
  return <LegalDocumentPage html={privacyHtml} titleKey="legal.privacyTitle" />
}

export function CookiePolicyPage() {
  return <LegalDocumentPage html={cookiePolicyHtml} titleKey="legal.cookiesTitle" />
}

export function TermsAndConditionsPage() {
  return <LegalDocumentPage html={termsHtml} titleKey="legal.termsTitle" />
}
