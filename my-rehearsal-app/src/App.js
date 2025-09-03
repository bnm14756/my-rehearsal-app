import React, { useState, useEffect } from 'react';
import { FaPhone, FaGoogle, FaSearch, FaMapMarkerAlt } from 'react-icons/fa';
import { useSpring, animated } from 'react-spring';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';

// Global variables provided by the Canvas environment for Firebase
const firebaseConfig = typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : {};
const appId = "wegobe"; // Use the specified project name
const initialAuthToken = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;

// Initialize Firebase app and services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const App = () => {
  const [spaces, setSpaces] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [loading, setLoading] = useState(true);

  // Animation for the main container
  const fadeIn = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    config: { duration: 500 }
  });

  // Modal animation
  const modalSpring = useSpring({
    from: { opacity: 0, transform: 'scale(0.9)' },
    to: { opacity: showModal ? 1 : 0, transform: showModal ? 'scale(1)' : 'scale(0.9)' },
    config: { tension: 300, friction: 20 },
    immediate: !showModal
  });

  // Authenticate and fetch data from Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("Firebase Auth error:", error);
        }
      }
    });

    const unsubscribeSnapshot = onSnapshot(collection(db, `artifacts/${appId}/public/data/rehearsalSpaces`), (snapshot) => {
      const fetchedSpaces = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSpaces(fetchedSpaces);
      setLoading(false);
    }, (error) => {
      console.error("Firestore data fetch error:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, []);

  // Filter spaces based on search term
  useEffect(() => {
    if (searchTerm) {
      setFilter(searchTerm.toLowerCase());
    } else {
      setFilter('');
    }
  }, [searchTerm]);

  const filteredSpaces = spaces.filter(space =>
    space.name.toLowerCase().includes(filter) ||
    space.location.toLowerCase().includes(filter)
  );

  // Handle phone call link
  const handlePhoneClick = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  // Handle Google Form link
  const handleGoogleFormClick = (url) => {
    window.open(url, '_blank');
  };
  
  // Custom modal instead of window.confirm
  const showCustomConfirm = (message, onConfirm) => {
    setModalContent(message);
    setShowModal(true);
    window.onConfirmAction = onConfirm;
  };

  const MemoizedSpaceCard = React.memo(({ space }) => {
    const slideIn = useSpring({
      from: { opacity: 0, transform: 'translateX(-20px)' },
      to: { opacity: 1, transform: 'translateX(0)' },
      config: { duration: 300 }
    });

    return (
      <animated.div style={slideIn} className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 transition-transform hover:scale-105 transform hover:shadow-xl duration-300">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{space.name}</h2>
        <div className="flex items-center text-gray-500 mb-4">
          <FaMapMarkerAlt className="mr-2 text-gray-400" />
          <p className="text-sm font-medium">{space.location}</p>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
          {space.schedule && space.schedule.map((slot, index) => (
            <button
              key={index}
              onClick={() => {
                if (!slot.booked) {
                  showCustomConfirm(`'${space.name}'의 ${slot.time} 예약을 진행하시겠습니까?`, () => {
                    handleGoogleFormClick(space.googleForm);
                    setShowModal(false);
                  });
                }
              }}
              className={`p-2 rounded-xl text-xs font-semibold transform transition-transform duration-200 hover:scale-105 ${
                slot.booked
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-70'
                  : 'bg-green-500 text-white hover:bg-green-600 shadow-md'
              }`}
              disabled={slot.booked}
              style={{
                '--tw-shadow': slot.booked ? 'none' : '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                '--tw-shadow-colored': '0 4px 6px -1px var(--tw-shadow-color), 0 2px 4px -2px var(--tw-shadow-color)',
                boxShadow: slot.booked ? 'none' : 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)'
              }}
            >
              {slot.time}
            </button>
          ))}
        </div>

        <div className="flex justify-between mt-6 space-x-2">
          <button
            onClick={() => handlePhoneClick(space.phone)}
            className="flex-1 flex items-center justify-center bg-blue-500 text-white py-2 px-4 rounded-full text-sm font-semibold transition-colors hover:bg-blue-600 shadow-md transform hover:scale-105 duration-200"
          >
            <FaPhone className="mr-2" /> 전화 예약
          </button>
          <button
            onClick={() => handleGoogleFormClick(space.googleForm)}
            className="flex-1 flex items-center justify-center bg-red-500 text-white py-2 px-4 rounded-full text-sm font-semibold transition-colors hover:bg-red-600 shadow-md transform hover:scale-105 duration-200"
          >
            <FaGoogle className="mr-2" /> 구글폼
          </button>
        </div>
      </animated.div>
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen font-inter antialiased flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        <animated.header style={fadeIn} className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-2">
            합주실 예약
          </h1>
          <p className="text-lg text-gray-600">
            주변의 합주실을 검색하고 예약 가능한 시간을 확인하세요.
          </p>
        </animated.header>

        <animated.div style={fadeIn} className="flex flex-col sm:flex-row items-center justify-center mb-8 bg-white p-3 rounded-full shadow-lg border border-gray-100">
          <div className="relative w-full sm:w-2/3 mb-4 sm:mb-0 sm:mr-4">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="위치 또는 합주실 이름을 검색하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            />
          </div>
          <button
            onClick={() => setFilter(searchTerm.toLowerCase())}
            className="w-full sm:w-1/3 flex items-center justify-center bg-blue-600 text-white py-3 px-6 rounded-full font-bold transition-colors hover:bg-blue-700 shadow-lg transform hover:scale-105 duration-200"
          >
            <FaSearch className="mr-2" /> 검색
          </button>
        </animated.div>

        <div className="space-y-6">
          {filteredSpaces.length > 0 ? (
            filteredSpaces.map((space) => (
              <MemoizedSpaceCard key={space.id} space={space} />
            ))
          ) : (
            <animated.div style={fadeIn} className="text-center p-8 bg-white rounded-3xl shadow-lg border border-gray-100">
              <p className="text-lg text-gray-500">검색 결과가 없습니다.</p>
              <p className="text-sm text-gray-400 mt-2">엑셀 파일을 업로드하여 데이터를 추가해 보세요.</p>
            </animated.div>
          )}
        </div>
      </div>
      
      {/* Custom Modal for Confirmation */}
      {showModal && (
        <animated.div style={modalSpring} className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
            <p className="text-gray-800 text-lg mb-6">{modalContent}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  if (window.onConfirmAction) {
                    window.onConfirmAction();
                    window.onConfirmAction = null;
                  }
                }}
                className="bg-green-500 text-white py-2 px-6 rounded-full font-semibold hover:bg-green-600 transition-colors duration-200"
              >
                예
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  window.onConfirmAction = null;
                }}
                className="bg-gray-300 text-gray-800 py-2 px-6 rounded-full font-semibold hover:bg-gray-400 transition-colors duration-200"
              >
                아니오
              </button>
            </div>
          </div>
        </animated.div>
      )}
    </div>
  );
};

export default App;