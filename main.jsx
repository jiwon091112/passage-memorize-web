import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Play, 
  RefreshCcw, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff,
  ChevronLeft,
  LayoutList,
  AlignLeft
} from 'lucide-react';

export default function App() {
  const [rawText, setRawText] = useState('');
  const [sentences, setSentences] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [results, setResults] = useState([]);
  const [showHints, setShowHints] = useState([]);
  const [mode, setMode] = useState(null); // 'sentence' | 'whole'
  const [wholeAttempt, setWholeAttempt] = useState('');
  const [wholeResult, setWholeResult] = useState(null);
  const [showWholeHint, setShowWholeHint] = useState(false);

  // 텍스트를 문장 단위로 분리하고 모드를 설정하는 함수
  const handleStartPractice = (selectedMode) => {
    // 줄바꿈이나 (마침표/느낌표/물음표 + 공백)을 기준으로 분리
    let processed = rawText.replace(/\n+/g, "|");
    processed = processed.replace(/([.!?])\s+/g, "$1|");
    
    const rawParsed = processed
      .split("|")
      .map(s => s.trim())
      .filter(s => s.length > 0);
      
    const parsed = [];
    let tempMarker = '';
    
    for (let i = 0; i < rawParsed.length; i++) {
      const current = rawParsed[i];
      // "1.", "A." 처럼 번호 매기기로 사용된 짧은 문자가 단독으로 분리된 경우 합치기 위한 조건
      if (/^([a-zA-Z가-힣]|\d+)[.!?]$/.test(current)) {
        tempMarker += (tempMarker ? ' ' : '') + current;
      } else {
        parsed.push((tempMarker ? tempMarker + ' ' : '') + current);
        tempMarker = '';
      }
    }
    
    // 텍스트가 번호로만 끝나는 예외 상황 처리
    if (tempMarker) {
      parsed.push(tempMarker);
    }
      
    setSentences(parsed);
    setMode(selectedMode);
    
    if (selectedMode === 'sentence') {
      setAttempts(new Array(parsed.length).fill(''));
      setResults(new Array(parsed.length).fill(null));
      setShowHints(new Array(parsed.length).fill(false));
    } else {
      setWholeAttempt('');
      setWholeResult(null);
      setShowWholeHint(false);
    }
  };

  // 단어 단위 Diff 알고리즘 (LCS 기반)
  const calculateDiff = (original, attempt) => {
    // 문장 앞의 번호(예: "1. ", "10 ", "A.", "1.")를 추출 및 제거하기 위한 정규식
    const bulletRegex = /^(?:[a-zA-Z가-힣][.!?\)\]]\s*|\d+[.!?\)\]]\s*|\d+\s+)/;
    
    let origBullet = '';
    const origMatch = original.trim().match(bulletRegex);
    if (origMatch) {
      origBullet = origMatch[0];
    }

    const origCleaned = original.trim().replace(bulletRegex, '').trim();
    const attCleaned = attempt.trim().replace(bulletRegex, '').trim();

    const origWords = origCleaned ? origCleaned.split(/\s+/) : [];
    const attWords = attCleaned ? attCleaned.split(/\s+/) : [];

    // 구두점을 제거하고 소문자로 변환하여 비교 (엄격한 비교 완화)
    const clean = (w) => w.replace(/[.,!?()"'';:]/g, '').toLowerCase();

    const dp = Array(origWords.length + 1).fill(null).map(() => Array(attWords.length + 1).fill(0));
    
    for (let i = 1; i <= origWords.length; i++) {
      for (let j = 1; j <= attWords.length; j++) {
        if (clean(origWords[i - 1]) === clean(attWords[j - 1])) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    let i = origWords.length;
    let j = attWords.length;
    const diff = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && clean(origWords[i - 1]) === clean(attWords[j - 1])) {
        diff.unshift({ text: origWords[i - 1], type: 'correct' });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diff.unshift({ text: attWords[j - 1], type: 'extra' });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        diff.unshift({ text: origWords[i - 1], type: 'missing' });
        i--;
      }
    }
    
    // 원본 문장에 번호가 있었다면, 채점 결과 맨 앞에 무조건 정답 처리하여 추가
    // (사용자가 번호를 안 쓰거나 틀리게 써도 맞는 것으로 간주됨)
    if (origBullet) {
      diff.unshift({ text: origBullet.trim(), type: 'correct' });
    }

    return diff;
  };

  const handleAttemptChange = (index, value) => {
    const newAttempts = [...attempts];
    newAttempts[index] = value;
    setAttempts(newAttempts);
    
    // 텍스트가 변경되면 기존 채점 결과 초기화
    if (results[index] !== null) {
      const newResults = [...results];
      newResults[index] = null;
      setResults(newResults);
    }
  };

  const handleGrade = (index) => {
    if (!attempts[index].trim()) return;
    const diff = calculateDiff(sentences[index], attempts[index]);
    const newResults = [...results];
    newResults[index] = diff;
    setResults(newResults);
  };

  const toggleHint = (index) => {
    const newHints = [...showHints];
    newHints[index] = !newHints[index];
    setShowHints(newHints);
  };

  const resetAll = () => {
    if(window.confirm('정말 처음으로 돌아가시겠습니까? 작성한 내용이 모두 삭제됩니다.')) {
      setMode(null);
      setRawText('');
      setSentences([]);
      setWholeAttempt('');
      setWholeResult(null);
    }
  };

  const isAllCorrect = (diff) => {
    return diff && diff.every(item => item.type === 'correct');
  };

  // 1. 설정 (입력) 화면
  if (!mode) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2 mb-10">
            <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-full mb-4">
              <BookOpen className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">영어 수행평가 암기 마스터</h1>
            <p className="text-slate-500">외워야 할 영어 지문을 아래에 붙여넣어 주세요.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h2 className="font-semibold text-slate-700">영어 원문 입력</h2>
            </div>
            <div className="p-6">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="여기에 영어 텍스트를 입력하거나 붙여넣으세요.&#10;예: Hello, everyone. Today I'm going to talk about..."
                className="w-full h-64 p-4 text-lg border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y transition-all"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <button
                  onClick={() => handleStartPractice('sentence')}
                  disabled={!rawText.trim()}
                  className="w-full flex items-center justify-center py-4 px-6 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <LayoutList className="w-5 h-5 mr-2" />
                  한 문장씩 연습하기
                </button>
                <button
                  onClick={() => handleStartPractice('whole')}
                  disabled={!rawText.trim()}
                  className="w-full flex items-center justify-center py-4 px-6 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <AlignLeft className="w-5 h-5 mr-2" />
                  통째로 연습하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. 연습 (채점) 화면
  const gradedCount = results.filter(r => r !== null).length;
  const perfectCount = results.filter(r => isAllCorrect(r)).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 pb-32 md:pb-48 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 상단 네비게이션 바 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200 gap-4">
          <button 
            onClick={resetAll}
            className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors font-medium"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            새로운 지문 입력
          </button>
          
          <div className="flex items-center gap-4 text-sm font-semibold">
            {mode === 'sentence' ? (
              <>
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg">
                  전체: {sentences.length}문장
                </span>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
                  진행: {gradedCount}개 채점
                </span>
                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg">
                  완벽: {perfectCount}개
                </span>
              </>
            ) : (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg flex items-center">
                <AlignLeft className="w-4 h-4 mr-1" />
                통글 암기 모드
              </span>
            )}
          </div>
        </div>

        {}
        {/* 문장 리스트 또는 통글 연습 영역 */}
        {mode === 'sentence' ? (
          <div className="space-y-6">
            {sentences.map((sentence, index) => {
              const result = results[index];
              const isPerfect = isAllCorrect(result);

              return (
                <div 
                  key={index} 
                  className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all ${
                    isPerfect ? 'border-green-400' : result ? 'border-amber-300' : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {/* 카드 헤더 */}
                  <div className={`px-5 py-3 border-b flex justify-between items-center ${
                    isPerfect ? 'bg-green-50 border-green-100' : result ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <h3 className="font-bold flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
                        isPerfect ? 'bg-green-500' : 'bg-slate-400'
                      }`}>
                        {index + 1}
                      </span>
                      문장 {index + 1}
                    </h3>
                    <button 
                      onClick={() => toggleHint(index)}
                      className="text-slate-500 hover:text-indigo-600 flex items-center text-sm font-medium transition-colors"
                    >
                      {showHints[index] ? <><EyeOff className="w-4 h-4 mr-1"/> 원문 숨기기</> : <><Eye className="w-4 h-4 mr-1"/> 원문 보기</>}
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* 원문 힌트 (토글) */}
                    {showHints[index] && (
                      <div className="p-4 bg-indigo-50 rounded-xl text-indigo-900 border border-indigo-100">
                        {sentence}
                      </div>
                    )}

                    {/* 입력 영역 */}
                    <textarea
                      value={attempts[index]}
                      onChange={(e) => handleAttemptChange(index, e.target.value)}
                      placeholder="기억나는 대로 영어 문장을 작성해보세요."
                      className="w-full h-24 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                      disabled={isPerfect}
                    />

                    {/* 채점 버튼 및 컨트롤 */}
                    <div className="flex justify-end gap-3">
                      {result && !isPerfect && (
                        <button 
                          onClick={() => handleAttemptChange(index, '')}
                          className="px-4 py-2 flex items-center text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                        >
                          <RefreshCcw className="w-4 h-4 mr-2" />
                          다시 쓰기
                        </button>
                      )}
                      {!isPerfect && (
                        <button
                          onClick={() => handleGrade(index)}
                          disabled={!attempts[index].trim()}
                          className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          채점하기
                        </button>
                      )}
                    </div>

                    {/* 결과 표시 영역 */}
                    {result && (
                      <div className={`p-4 rounded-xl border ${isPerfect ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                        {isPerfect ? (
                          <div className="flex items-center text-green-700 font-bold">
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            완벽하게 외우셨습니다!
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center text-amber-700 font-bold mb-2">
                              <AlertCircle className="w-5 h-5 mr-2" />
                              틀린 부분을 확인해보세요:
                            </div>
                            <div className="flex flex-wrap gap-x-1.5 gap-y-2 text-lg">
                              {result.map((word, i) => {
                                if (word.type === 'correct') {
                                  return <span key={i} className="text-slate-800">{word.text}</span>;
                                } else if (word.type === 'missing') {
                                  return (
                                    <span key={i} className="text-red-500 font-bold underline decoration-red-500/50 decoration-2 underline-offset-4" title="누락된 단어">
                                      {word.text}
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span key={i} className="text-slate-400 line-through" title="잘못 추가된 단어">
                                      {word.text}
                                    </span>
                                  );
                                }
                              })}
                            </div>
                            
                            <div className="flex gap-4 mt-4 pt-4 border-t border-slate-200 text-sm">
                              <div className="flex items-center text-red-500">
                                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                                <span>내가 빠뜨린 단어</span>
                              </div>
                              <div className="flex items-center text-slate-400">
                                <div className="w-3 h-3 bg-slate-300 rounded-full mr-2"></div>
                                <span className="line-through">잘못 쓴 단어</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all ${
            isAllCorrect(wholeResult) ? 'border-green-400' : wholeResult ? 'border-amber-300' : 'border-slate-200'
          }`}>
            <div className={`px-5 py-3 border-b flex justify-between items-center ${
              isAllCorrect(wholeResult) ? 'bg-green-50 border-green-100' : wholeResult ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'
            }`}>
              <h3 className="font-bold flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
                  isAllCorrect(wholeResult) ? 'bg-green-500' : 'bg-slate-400'
                }`}>
                  전체
                </span>
                지문 통째로 작성하기
              </h3>
              <button 
                onClick={() => setShowWholeHint(!showWholeHint)}
                className="text-slate-500 hover:text-emerald-600 flex items-center text-sm font-medium transition-colors"
              >
                {showWholeHint ? <><EyeOff className="w-4 h-4 mr-1"/> 원문 숨기기</> : <><Eye className="w-4 h-4 mr-1"/> 원문 보기</>}
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 원문 힌트 (토글) */}
              {showWholeHint && (
                <div className="p-4 bg-emerald-50 rounded-xl text-emerald-900 border border-emerald-100 whitespace-pre-wrap">
                  {rawText}
                </div>
              )}

              {/* 입력 영역 */}
              <textarea
                value={wholeAttempt}
                onChange={(e) => {
                  setWholeAttempt(e.target.value);
                  if (wholeResult) setWholeResult(null); // 입력 변경 시 이전 채점결과 초기화
                }}
                placeholder="기억나는 대로 영어 지문 전체를 작성해보세요."
                className="w-full h-64 md:h-96 p-4 text-base md:text-lg border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-y"
                disabled={isAllCorrect(wholeResult)}
              />

              {/* 채점 버튼 및 컨트롤 */}
              <div className="flex justify-end gap-3">
                {wholeResult && !isAllCorrect(wholeResult) && (
                  <button 
                    onClick={() => setWholeAttempt('')}
                    className="px-4 py-2 flex items-center text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    다시 쓰기
                  </button>
                )}
                {!isAllCorrect(wholeResult) && (
                  <button
                    onClick={() => setWholeResult(calculateDiff(rawText, wholeAttempt))}
                    disabled={!wholeAttempt.trim()}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    전체 채점하기
                  </button>
                )}
              </div>

              {/* 결과 표시 영역 */}
              {wholeResult && (
                <div className={`p-4 rounded-xl border ${isAllCorrect(wholeResult) ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                  {isAllCorrect(wholeResult) ? (
                    <div className="flex items-center text-green-700 font-bold">
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      전체 지문을 완벽하게 외우셨습니다!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center text-amber-700 font-bold mb-2">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        틀린 부분을 확인해보세요:
                      </div>
                      <div className="flex flex-wrap gap-x-1.5 gap-y-2 text-base md:text-lg">
                        {wholeResult.map((word, i) => {
                          if (word.type === 'correct') {
                            return <span key={i} className="text-slate-800">{word.text}</span>;
                          } else if (word.type === 'missing') {
                            return (
                              <span key={i} className="text-red-500 font-bold underline decoration-red-500/50 decoration-2 underline-offset-4" title="누락된 단어">
                                {word.text}
                              </span>
                            );
                          } else {
                            return (
                              <span key={i} className="text-slate-400 line-through" title="잘못 추가된 단어">
                                {word.text}
                              </span>
                            );
                          }
                        })}
                      </div>
                      
                      <div className="flex gap-4 mt-4 pt-4 border-t border-slate-200 text-sm">
                        <div className="flex items-center text-red-500">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                          <span>내가 빠뜨린 단어</span>
                        </div>
                        <div className="flex items-center text-slate-400">
                          <div className="w-3 h-3 bg-slate-300 rounded-full mr-2"></div>
                          <span className="line-through">잘못 쓴 단어</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {}
        {(mode === 'sentence' && perfectCount === sentences.length && sentences.length > 0) || 
         (mode === 'whole' && isAllCorrect(wholeResult)) ? (
          <div className="bg-indigo-600 text-white p-8 rounded-2xl text-center shadow-lg transform transition-all animate-bounce mt-8">
            <h2 className="text-3xl font-bold mb-2">축하합니다! 🎉</h2>
            <p className="text-indigo-100 text-lg">
              {mode === 'sentence' ? '모든 문장을' : '전체 지문을'} 완벽하게 암기하셨습니다!
            </p>
          </div>
        ) : null}

      </div>
    </div>
  );
}