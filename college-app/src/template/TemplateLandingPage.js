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
import Footer from './footer';
import './template.css';

const getHashView = () => {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('bachelor-')) return { view: 'bachelor-country', countryId: hash.slice('bachelor-'.length) };
  if (hash.startsWith('master-')) return { view: 'master-country', countryId: hash.slice('master-'.length) };
  if (hash.startsWith('medical-')) return { view: 'medical-country', countryId: hash.slice('medical-'.length) };
  if (['bachelor', 'master', 'medical', 'contact'].includes(hash)) return { view: hash, countryId: '' };
  return { view: 'home', countryId: '' };
};

const TemplateLandingPage = () => {
  const [page, setPage] = useState(getHashView);
  const changeView = useCallback((view) => {
    setPage({ view, countryId: '' });
    if (view === 'home') window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const syncHash = () => setPage(getHashView());
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const handleHeaderViewChange = (view) => {
    if (view === 'contact') {
      changeView('contact');
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#contact`);
      return;
    }
    changeView(view);
  };

  let content;
  if (page.view === 'bachelor') content = <Bachelor onViewChange={changeView} />;
  else if (page.view === 'master') content = <Master onViewChange={changeView} />;
  else if (page.view === 'medical') content = <Medical onViewChange={changeView} />;
  else if (page.view === 'bachelor-country' || page.view === 'master-country') content = <StudyCountry level={page.view === 'master-country' ? 'master' : 'bachelor'} id={page.countryId} onViewChange={changeView} />;
  else if (page.view === 'medical-country') content = <MedicalCountry id={page.countryId} onViewChange={changeView} />;
  else if (page.view === 'contact') content = <Contact />;
  else content = <><Hero /><Explore /><TopStudy /><YourFuture /><Steps /><Testimonials /></>;

  return <div className="template-site"><Header currentView={page.view.replace('-country', '')} onViewChange={handleHeaderViewChange} />{content}<Footer onViewChange={handleHeaderViewChange} /></div>;
};

export default TemplateLandingPage;
