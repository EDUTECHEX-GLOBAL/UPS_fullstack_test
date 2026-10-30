import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './header.css';
import Logo from './logo';
import CountryFlag from './countryFlags';
import { medicalCountries } from './medicalData';
import { partnerCountries } from './studyData';

const MENUS = [
  { key: 'master', label: 'Master', view: 'master', countries: partnerCountries },
  { key: 'bachelor', label: 'Bachelor', view: 'bachelor', countries: partnerCountries },
  { key: 'medical', label: 'Medical', view: 'medical', countries: medicalCountries },
];

const Header = ({ currentView, onViewChange }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const closeAll = () => {
    setMobileMenuOpen(false);
    setOpenMenu(null);
  };

  const handleNav = (viewName) => {
    closeAll();
    if (onViewChange) onViewChange(viewName);
  };

  const handleMenuNav = (menu, countryId) => {
    closeAll();
    if (onViewChange) onViewChange(menu.view);
    if (typeof window !== 'undefined') {
      window.location.hash = countryId ? `${menu.key}-${countryId}` : menu.key;
    }
  };

  const handleLoginNav = (path) => {
    closeAll();
    navigate(path);
  };

  return (
    <header className="site-header">
      <div className="header-container">
        <div className="header-logo">
          <button onClick={() => handleNav('home')} className="logo-btn" aria-label="StudyAbroad home">
            <Logo />
          </button>
        </div>

        <nav className={`header-nav ${mobileMenuOpen ? 'active' : ''}`}>
          <ul className="nav-list">
            <li className="nav-item">
              <button
                onClick={() => handleNav('home')}
                className={`nav-link ${currentView === 'home' ? 'active' : ''}`}
              >
                Home
              </button>
            </li>

            {MENUS.map((menu) => (
              <li
                key={menu.key}
                className={`nav-item nav-item--dropdown ${openMenu === menu.key ? 'open' : ''}`}
                onMouseEnter={() => setOpenMenu(menu.key)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button
                  type="button"
                  className={`nav-link nav-link--dropdown ${currentView === menu.view ? 'active' : ''}`}
                  onClick={() => setOpenMenu((cur) => (cur === menu.key ? null : menu.key))}
                  aria-expanded={openMenu === menu.key}
                  aria-haspopup="true"
                >
                  {menu.label}
                  <span className="nav-caret" aria-hidden="true" />
                </button>

                <ul className="nav-dropdown">
                  <li>
                    <button
                      type="button"
                      className="nav-dropdown-link nav-dropdown-link--all"
                      onClick={() => handleMenuNav(menu, null)}
                    >
                      All destinations
                    </button>
                  </li>
                  {menu.countries.map((country) => (
                    <li key={country.id}>
                      <button
                        type="button"
                        className="nav-dropdown-link"
                        onClick={() => handleMenuNav(menu, country.id)}
                      >
                        <CountryFlag id={country.id} size={18} />
                        {country.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}

            <li className="nav-item">
              <button
                onClick={() => handleNav('contact')}
                className={`nav-link ${currentView === 'contact' ? 'active' : ''}`}
              >
                Contact
              </button>
            </li>
            <li
              className={`nav-item nav-item--dropdown nav-item--mobile-login ${openMenu === 'login-nav' ? 'open' : ''}`}
            >
              <button
                type="button"
                className="nav-link nav-link--dropdown"
                onClick={() => setOpenMenu((current) => current === 'login-nav' ? null : 'login-nav')}
                aria-expanded={openMenu === 'login-nav'}
                aria-haspopup="true"
              >
                Login
                <span className="nav-caret" aria-hidden="true" />
              </button>
              <ul className="nav-dropdown mobile-login-dropdown">
                <li><button type="button" className="nav-dropdown-link" onClick={() => handleLoginNav('/home')}>Student</button></li>
                <li><button type="button" className="nav-dropdown-link" onClick={() => handleLoginNav('/process-admin-login')}>Partner</button></li>
                <li><button type="button" className="nav-dropdown-link" onClick={() => handleLoginNav('/admin-login')}>Admin</button></li>
              </ul>
            </li>
            <li className="nav-item nav-item--cta">
              <button onClick={() => handleNav('contact')} className="btn btn-primary-pill">
                Get Free Consultation
              </button>
            </li>
          </ul>
        </nav>

        <div className="header-cta">
          <div className={`header-login-cta ${openMenu === 'login-button' ? 'open' : ''}`}>
            <button
              type="button"
              className="header-login-button"
              onClick={() => setOpenMenu((current) => (current === 'login-button' ? null : 'login-button'))}
              aria-expanded={openMenu === 'login-button'}
              aria-haspopup="true"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M5 21a7 7 0 0 1 14 0" />
              </svg>
              Login
              <span className="header-login-caret" aria-hidden="true" />
            </button>
            <ul className="nav-dropdown header-login-dropdown">
              <li><button type="button" className="nav-dropdown-link" onClick={() => handleLoginNav('/home')}>Student</button></li>
              <li><button type="button" className="nav-dropdown-link" onClick={() => handleLoginNav('/process-admin-login')}>Partner</button></li>
              <li><button type="button" className="nav-dropdown-link" onClick={() => handleLoginNav('/admin-login')}>Admin</button></li>
            </ul>
          </div>
          <button onClick={() => handleNav('contact')} className="btn btn-primary-pill header-cta-desktop">
            Get Free Consultation
          </button>
          <button
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className={`hamburger ${mobileMenuOpen ? 'is-open' : ''}`}></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
