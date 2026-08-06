import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { getSiteContentMap } from '../services/supabaseData';

const DEFAULT_TERMS = `# Catholic Silanga CBO — Terms of Service

Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Welcome to the Catholic Silanga CBO community site. By registering an account or using this site, you agree to the following terms.

## 1. Membership
This site is for verified members of the Catholic Silanga Catholic community organisation. Accounts are subject to administrator approval before they become active.

## 2. Account Security
You are responsible for keeping your password secure. Use a strong, unique password and do not share it. If you suspect unauthorised access, change your password immediately.

## 3. Acceptable Use
- Be respectful in all interactions, contributions, and announcements.
- Do not post unlawful, hateful, or misleading content.
- Do not attempt to access data you are not authorised to see.

## 4. Contributions
Contributions recorded on this site are subject to verification by an authorised Treasurer or Administrator. A contribution is considered "complete" only after verification. Pending or failed verifications are not binding.

## 5. Privacy
We collect only the information you provide (name, email, phone, photo, bio). We never sell your data. See the Privacy page for full details.

## 6. Termination
Administrators may suspend or remove accounts that violate these terms.

## 7. Changes
These terms may be updated from time to time. Continued use of the site after changes constitutes acceptance.

For questions, contact the parish office.`;

export const TermsPage: React.FC = () => {
  const [terms, setTerms] = useState<string>(DEFAULT_TERMS);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getSiteContentMap(['terms_of_service'] as const);
        if (!mounted) return;
        if (data.terms_of_service) {
          setTerms(data.terms_of_service);
        }
      } catch (err) {
        console.warn('Could not load terms from site_content, using default', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      <PageHeader
        subtitle="Legal"
        title="Terms of Service"
        description="The rules that govern your use of this community site."
      />
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="prose prose-slate dark:prose-invert max-w-none bg-card border rounded-xl p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6 not-prose">
              <div className="inline-flex w-12 h-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-bold m-0">Terms of Service</h1>
                <p className="text-xs text-muted-foreground m-0">
                  Editable from the admin dashboard (Site Content tab).
                </p>
              </div>
            </div>
            <pre className="font-sans whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 m-0">
              {terms}
            </pre>
          </motion.article>
        </div>
      </section>
    </>
  );
};