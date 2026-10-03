import { useEffect, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { Check, LoaderCircle, ArrowUpRight } from 'lucide-react';
import { request } from './api';
import { Mark, ProductPreview } from './ProductUI';
const LABELS = {
  verified: 'Email verified',
  features: 'Adding your tools',
  'sample-data': 'Preparing your first workspace',
  branding: 'Applying your name and theme',
  routing: 'Connecting your site',
  ready: 'Your site is ready',
};
export default function Provisioning() {
  const { slug } = useParams(),
    location = useLocation(),
    [job, setJob] = useState(null),
    [error, setError] = useState('');
  useEffect(() => {
    let stop = false,
      timer;
    const load = async () => {
      try {
        const r = await request(
          '/api/platform/provisioning/' + encodeURIComponent(slug),
        );
        if (stop) return;
        setJob(r);
        setError('');
        if (r.status === 'complete' && location.state?.entryToken) {
          timer = setTimeout(
            () =>
              window.location.assign(
                r.siteUrl +
                  '/?entry=' +
                  encodeURIComponent(location.state.entryToken),
              ),
            800,
          );
        } else if (r.status !== 'complete' && r.status !== 'failed')
          timer = setTimeout(load, 650);
      } catch (e) {
        if (!stop) setError(e.message);
      }
    };
    load();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [slug]);
  const index = job?.stages.indexOf(job.stage) || 0;
  return (
    <main className="plinth p-provisioning">
      <Link to="/" className="p-wordmark">
        <Mark />
        <span>plinth</span>
      </Link>
      <p className="p-caption">A place is taking shape</p>
      <h1>
        {job?.status === 'complete'
          ? 'Welcome to ' + job.name + '.'
          : 'Your site is being built.'}
      </h1>
      <p>
        {job?.status === 'complete'
          ? 'Your name, your tools, your people. Ready when you are.'
          : 'You can leave this page. We’ll keep your progress and finish the setup.'}
      </p>
      <div className="p-provisioning-layout">
        <ol>
          {Object.entries(LABELS).map(([key, label], i) => (
            <li key={key} className={i <= index ? 'active' : ''}>
              <span>
                {i < index || job?.status === 'complete' ? (
                  <Check size={16} />
                ) : i === index ? (
                  <LoaderCircle size={16} />
                ) : (
                  i + 1
                )}
              </span>
              <div>
                {label}
                {i === index && job?.status !== 'complete' && (
                  <small>
                    {job?.status === 'failed'
                      ? 'We hit a problem. Contact the platform owner.'
                      : 'In progress'}
                  </small>
                )}
              </div>
            </li>
          ))}
        </ol>
        <ProductPreview
          path={job?.path || 'institute'}
          name={job?.name || 'Your organisation'}
        />
      </div>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
      {job?.status === 'complete' && (
        <a className="p-solid-button" href={job.siteUrl}>
          Open my site <ArrowUpRight size={18} />
        </a>
      )}
    </main>
  );
}
