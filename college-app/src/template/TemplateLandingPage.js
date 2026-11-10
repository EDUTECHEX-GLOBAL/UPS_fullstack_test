import React, { useCallback, useEffect, useState } from 'react';
import Header from './header';
import Hero from './hero';
import Explore from './explore';
import TopStudy from './top-study';
import YourFuture from './your-furture';
import Bachelor from './bachelor';
import Master from './master';
import Medical from './medical';
import StudyCountry from './StudyCountry';
import MedicalCountry from './MedicalCountry';
import Steps from './steps';
import Testimonials from './test-mionals';
import Contact from './contact';
import TermsConditions from './TermsConditions';
import PrivacyPolicy from './PrivacyPolicy';
import Footer from './footer';
import './template.css';

const getHashView = (initialView) => {
  if (initialView) return { view: initialView, countryId: '' };
  const pathname = window.location.pathname.replace(/\/+$/, '');
  if (pathname === '/privacy') return { view: 'privacy', countryId: '' };
  if (pathname === '/terms') return { view: 'terms', countryId: '' };
  if (pathname === '/contact') return { view: 'contact', countryId: '' };

  const hash = window.location.hash.slice(1);
  if (hash.startsWith('bachelor-')) return { view: 'bachelor-country', countryId: hash.slice('bachelor-'.length) };
  if (hash.startsWith('master-')) return { view: 'master-country', countryId: hash.slice('master-'.length) };
  if (hash.startsWith('medical-')) return { view: 'medical-country', countryId: hash.slice('medical-'.length) };
  if (['bachelor', 'master', 'medical', 'contact', 'privacy', 'terms'].includes(hash)) {
    return { view: hash, countryId: '' };
  }
  return { view: 'home', countryId: '' };
};

const TemplateLandingPage = ({ initialView }) => {
  const [page, setPage] = useState(() => getHashView(initialView));

  const changeView = useCallback((view, countryId = '') => {
    setPage({ view, countryId });
    if (view === 'home') {
      window.history.replaceState(null, '', '/');
    } else if (view === 'bachelor-country') {
      if (window.location.hash !== `#bachelor-${countryId}`) {
        window.history.pushState(null, '', `/#bachelor-${countryId}`);
      }
    } else if (view === 'master-country') {
      if (window.location.hash !== `#master-${countryId}`) {
        window.history.pushState(null, '', `/#master-${countryId}`);
      }
    } else if (view === 'medical-country') {
      if (window.location.hash !== `#medical-${countryId}`) {
        window.history.pushState(null, '', `/#medical-${countryId}`);
      }
    } else {
      if (window.location.hash !== `#${view}`) {
        window.history.pushState(null, '', `/#${view}`);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const syncHash = () => {
      setPage(getHashView(initialView));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', syncHash);
    window.addEventListener('popstate', syncHash);
    return () => {
      window.removeEventListener('hashchange', syncHash);
      window.removeEventListener('popstate', syncHash);
    };
  }, [initialView]);

  let content;
  if (page.view === 'bachelor') content = <Bachelor onViewChange={changeView} />;
  else if (page.view === 'master') content = <Master onViewChange={changeView} />;
  else if (page.view === 'medical') content = <Medical onViewChange={changeView} />;
  else if (page.view === 'bachelor-country' || page.view === 'master-country') content = <StudyCountry level={page.view === 'master-country' ? 'master' : 'bachelor'} id={page.countryId} onViewChange={changeView} />;
  else if (page.view === 'medical-country') content = <MedicalCountry id={page.countryId} onViewChange={changeView} />;
  else if (page.view === 'contact') content = <Contact />;
  else if (page.view === 'terms') content = <TermsConditions />;
  else if (page.view === 'privacy') content = <PrivacyPolicy />;
  else (
    content = (
      <>
        <Hero onViewChange={changeView} />
        <Explore />
        <TopStudy onViewChange={changeView} />
        <YourFuture onViewChange={changeView} />
        <Steps />
        <Testimonials />
      </>
    )
  );

  return (
    <div className="template-site">
      <Header currentView={page.view.replace('-country', '')} onViewChange={changeView} />
      {content}
      <Footer onViewChange={changeView} />
    </div>
  );
};

export default TemplateLandingPage;
