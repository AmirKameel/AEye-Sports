export type Language = 'en' | 'ar';

export const defaultLanguage: Language = 'en';

export const languages: { [key in Language]: { name: string; dir: 'ltr' | 'rtl' } } = {
  en: {
    name: 'English',
    dir: 'ltr'
  },
  ar: {
    name: 'العربية',
    dir: 'rtl'
  }
};

export const translations = {
  en: {
    common: {
      backToHome: 'Back to Home',
      getStarted: 'Get Started',
      newAnalysis: 'New Analysis',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      uploadVideo: 'Upload Video',
      backToTennis: 'Back to Tennis',
      backToFootball: 'Back to Football',
      analyze: 'Analyze',
      results: 'Results',
      upload: 'Upload',
      select: 'Select',
      capture: 'Capture',
      remove: 'Remove',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      clickToUpload: 'Click to upload or drag and drop',
      maxFileSize: 'max. 100MB',
      back: 'Back',
      note: 'Note',
      complete: 'complete'
    },
    header: {
      subtitle: 'Advanced analysis for football and tennis'
    },
    error: {
      pageNotFound: 'Page Not Found',
      pageNotFoundDescription: 'The page you are looking for doesn\'t exist or has been moved.'
    },
    home: {
      title: 'Sports Analysis Hub',
      subtitle: 'Professional tools for sports analysis and coaching',
      football: {
        title: 'Football Analysis',
        description: 'Professional tools for football coaches, analysts, and enthusiasts'
      },
      tennis: {
        title: 'Tennis Analysis',
        description: 'Advanced tennis analysis tools for players and coaches'
      }
    },
    football: {
      title: 'Football Analysis Tools',
      subtitle: 'Professional tools for football analysis and coaching',
      features: {
        formation: {
          title: 'Formation Analyzer',
          description: 'Design tactical formations, create scenarios and analyze team setups'
        },
        videoAnalysis: {
          title: 'Video Analysis',
          description: 'Upload videos and get AI-powered analysis of player and team performance'
        },
        performance: {
          title: 'Performance Metrics',
          description: 'Track and visualize player statistics and performance metrics'
        },
        profileMaker: {
          title: 'Player Profile Maker',
          description: 'Create and generate custom player profiles'
        }
      },
      pages: {
        formation: {
          title: 'Formation Analysis',
          subtitle: 'Design and analyze tactical formations',
          createFormation: 'Create Formation',
          analyzeFormation: 'Analyze Formation',
          saveFormation: 'Save Formation',
          loadFormation: 'Load Formation'
        },
        videoAnalysis: {
          title: 'Football Video Analysis',
          subtitle: 'Analyze player and team performance from videos',
          uploadVideo: 'Upload Video',
          selectFrames: 'Select Frames',
          analyzeFrames: 'Analyze Frames',
          viewResults: 'View Results'
        },
        performance: {
          title: 'Performance Analysis',
          subtitle: 'Track and visualize player statistics',
          playerStats: 'Player Statistics',
          teamStats: 'Team Statistics',
          matchStats: 'Match Statistics',
          trends: 'Performance Trends'
        },
        profileMaker: {
          title: 'Player Profile Maker',
          subtitle: 'Create detailed player profiles',
          basicInfo: 'Basic Information',
          statistics: 'Statistics',
          achievements: 'Achievements',
          generateProfile: 'Generate Profile'
        }
      }
    },
    tennis: {
      title: 'Tennis Analysis Tools',
      subtitle: 'Advanced tools for tennis analysis and coaching',
      features: {
        videoAnalysis: {
          title: 'Video Analysis',
          description: 'Upload videos and get AI-powered analysis of player and ball tracking'
        },
        playerAnalysis: {
          title: 'Player Analysis',
          description: 'Analyze player movement, shots, and performance metrics automatically. Track ball and player positioning.'
        }
      },
      pages: {
        videoAnalysis: {
          title: 'Tennis Video Analysis',
          subtitle: 'Analyze player and ball movement from videos',
          uploadVideo: 'Upload Video',
          selectFrames: 'Select Frames',
          analyzeFrames: 'Analyze Frames',
          viewResults: 'View Results'
        },
        playerAnalysis: {
          title: 'Player Analysis',
          subtitle: 'Analyze player movement, shots, and performance metrics',
          uploadVideo: 'Upload Video',
          analyzePlayer: 'Analyze Player',
          viewResults: 'View Results',
          playerMetrics: 'Player Metrics',
          shotAnalysis: 'Shot Analysis',
          movementAnalysis: 'Movement Analysis',
          uploadDescription: 'Upload a tennis video for player analysis. For best results, use a video that clearly shows the player and the ball.',
          uploadNote: 'Note: For testing purposes, we recommend using a short video (10-30 seconds) to speed up processing.',
          chooseAnalysisType: 'Choose Analysis Type',
          playerAnalysis: 'Player Analysis',
          playerAnalysisDescription: 'Analyze player movement, shots, and performance metrics automatically. Track ball and player positioning.',
          startPlayerAnalysis: 'Start Player Analysis',
          videoAnalysis: 'Video Analysis',
          videoAnalysisDescription: 'Analyze specific frames of your tennis video. Get detailed feedback on technique, positioning, and tactics.',
          goToVideoAnalysis: 'Go to Video Analysis',
          analyzingVideo: 'Analyzing Video',
          analysisWaitMessage: 'This may take a few minutes. Please don\'t close this window.'
        },
        results: {
          title: 'Tennis Analysis Results',
          newAnalysis: 'New Analysis',
          video: 'Video',
          videoNotSupported: 'Your browser does not support the video tag.',
          analysisSummary: 'Analysis Summary',
          analysisFormatNotAvailable: 'The analysis was completed, but the detailed tennis analysis format is not available. This may be because the analysis was performed with an older version of the system.',
          analysisInProgress: 'Analysis in Progress',
          analysisWaitMessage: 'Your tennis video is currently being analyzed. This may take a few minutes.',
          analysisFailed: 'Analysis Failed',
          analysisError: 'There was an error processing your video. Please try again.',
          analysisNotFound: 'Analysis not found'
        }
      }
    }
  },
  ar: {
    common: {
      backToHome: 'العودة للرئيسية',
      getStarted: 'ابدأ الآن',
      newAnalysis: 'تحليل جديد',
      loading: 'جاري التحميل...',
      error: 'خطأ',
      success: 'تم بنجاح',
      uploadVideo: 'رفع الفيديو',
      backToTennis: 'العودة للتنس',
      backToFootball: 'العودة لكرة القدم',
      analyze: 'تحليل',
      results: 'النتائج',
      upload: 'رفع',
      select: 'اختيار',
      capture: 'التقاط',
      remove: 'إزالة',
      processing: 'جاري المعالجة',
      completed: 'مكتمل',
      failed: 'فشل',
      clickToUpload: 'اضغط لرفع أو سحب وإفلات',
      maxFileSize: 'أقصى حجم ملف 100MB',
      back: 'رجوع',
      note: 'ملاحظة',
      complete: 'مكتمل'
    },
    header: {
      subtitle: 'تحليل متقدم لكرة القدم والتنس'
    },
    error: {
      pageNotFound: 'الصفحة غير موجودة',
      pageNotFoundDescription: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.'
    },
    home: {
      title: 'مركز تحليل الرياضة',
      subtitle: 'أدوات احترافية لتحليل الرياضة والتدريب',
      football: {
        title: 'تحليل كرة القدم',
        description: 'أدوات احترافية لمدربي كرة القدم والمحللين والهواة'
      },
      tennis: {
        title: 'تحليل التنس',
        description: 'أدوات متقدمة لتحليل التنس للاعبين والمدربين'
      }
    },
    football: {
      title: 'أدوات تحليل كرة القدم',
      subtitle: 'أدوات احترافية لتحليل كرة القدم والتدريب',
      features: {
        formation: {
          title: 'محلل التشكيلات',
          description: 'تصميم التشكيلات التكتيكية وإنشاء السيناريوهات وتحليل ترتيبات الفريق'
        },
        videoAnalysis: {
          title: 'تحليل الفيديو',
          description: 'رفع مقاطع الفيديو والحصول على تحليل مدعوم بالذكاء الاصطناعي لأداء اللاعبين والفريق'
        },
        performance: {
          title: 'مقاييس الأداء',
          description: 'تتبع وتصور إحصائيات اللاعبين ومقاييس الأداء'
        },
        profileMaker: {
          title: 'منشئ ملفات اللاعبين',
          description: 'إنشاء وتوليد ملفات تعريفية مخصصة للاعبين'
        }
      },
      pages: {
        formation: {
          title: 'تحليل التشكيلات',
          subtitle: 'تصميم وتحليل التشكيلات التكتيكية',
          createFormation: 'إنشاء تشكيل',
          analyzeFormation: 'تحليل التشكيل',
          saveFormation: 'حفظ التشكيل',
          loadFormation: 'تحميل التشكيل'
        },
        videoAnalysis: {
          title: 'تحليل فيديو كرة القدم',
          subtitle: 'تحليل أداء اللاعبين والفريق من مقاطع الفيديو',
          uploadVideo: 'رفع الفيديو',
          selectFrames: 'اختيار الإطارات',
          analyzeFrames: 'تحليل الإطارات',
          viewResults: 'عرض النتائج'
        },
        performance: {
          title: 'تحليل الأداء',
          subtitle: 'تتبع وتصور إحصائيات اللاعبين',
          playerStats: 'إحصائيات اللاعب',
          teamStats: 'إحصائيات الفريق',
          matchStats: 'إحصائيات المباراة',
          trends: 'اتجاهات الأداء'
        },
        profileMaker: {
          title: 'منشئ ملفات اللاعبين',
          subtitle: 'إنشاء ملفات تعريفية مفصلة للاعبين',
          basicInfo: 'المعلومات الأساسية',
          statistics: 'الإحصائيات',
          achievements: 'الإنجازات',
          generateProfile: 'إنشاء الملف'
        }
      }
    },
    tennis: {
      title: 'أدوات تحليل التنس',
      subtitle: 'أدوات متقدمة لتحليل التنس والتدريب',
      features: {
        videoAnalysis: {
          title: 'تحليل الفيديو',
          description: 'رفع مقاطع الفيديو والحصول على تحليل مدعوم بالذكاء الاصطناعي لتتبع اللاعب والكرة'
        },
        playerAnalysis: {
          title: 'تحليل اللاعب',
          description: 'تحليل حركة اللاعب والضربات ومقاييس الأداء تلقائياً. تتبع موضع الكرة واللاعب.'
        }
      },
      pages: {
        videoAnalysis: {
          title: 'تحليل فيديو التنس',
          subtitle: 'تحليل حركة اللاعب والكرة من مقاطع الفيديو',
          uploadVideo: 'رفع الفيديو',
          selectFrames: 'اختيار الإطارات',
          analyzeFrames: 'تحليل الإطارات',
          viewResults: 'عرض النتائج'
        },
        playerAnalysis: {
          title: 'تحليل اللاعب',
          subtitle: 'تحليل حركة اللاعب والضربات ومقاييس الأداء',
          uploadVideo: 'رفع الفيديو',
          analyzePlayer: 'تحليل اللاعب',
          viewResults: 'عرض النتائج',
          playerMetrics: 'مقاييس اللاعب',
          shotAnalysis: 'تحليل الضربات',
          movementAnalysis: 'تحليل الحركة',
          uploadDescription: 'رفع فيديو تنس لتحليل اللاعب. للحصول على أفضل النتائج، استخدم مقطع فيديو يظهر اللاعب والكرة بوضوح.',
          uploadNote: 'ملاحظة: لأغراض الاختبار، نوصي باستخدام مقطع فيديو قصير (10-30 ثانية) لتسريع المعالجة.',
          chooseAnalysisType: 'اختر نوع التحليل',
          playerAnalysis: 'تحليل اللاعب',
          playerAnalysisDescription: 'تحليل حركة اللاعب والضربات ومقاييس الأداء تلقائياً. تتبع موضع الكرة واللاعب.',
          startPlayerAnalysis: 'بدء تحليل اللاعب',
          videoAnalysis: 'تحليل الفيديو',
          videoAnalysisDescription: 'تحليل إطارات محددة من فيديو التنس الخاص بك. احصل على تعليقات مفصلة حول التقنية والموضع والتكتيكات.',
          goToVideoAnalysis: 'الذهاب إلى تحليل الفيديو',
          analyzingVideo: 'جاري تحليل الفيديو',
          analysisWaitMessage: 'قد يستغرق هذا بضع دقائق. يرجى عدم إغلاق هذه النافذة.'
        },
        results: {
          title: 'نتائج تحليل التنس',
          newAnalysis: 'تحليل جديد',
          video: 'الفيديو',
          videoNotSupported: 'متصفحك لا يدعم علامة الفيديو.',
          analysisSummary: 'ملخص التحليل',
          analysisFormatNotAvailable: 'تم إكمال التحليل، ولكن تنسيق تحليل التنس المفصل غير متاح. قد يكون هذا لأن التحليل تم إجراؤه بإصدار أقدم من النظام.',
          analysisInProgress: 'التحليل قيد التنفيذ',
          analysisWaitMessage: 'يتم حالياً تحليل فيديو التنس الخاص بك. قد يستغرق هذا بضع دقائق.',
          analysisFailed: 'فشل التحليل',
          analysisError: 'حدث خطأ أثناء معالجة الفيديو الخاص بك. يرجى المحاولة مرة أخرى.',
          analysisNotFound: 'لم يتم العثور على التحليل'
        }
      }
    }
  }
}; 