---
name: '🚀 Feature / Job Task'
about: '새 자동화 Job 또는 기능 개발 요청'
title: '[Feat] '
labels: ['type:feature', 'priority:medium']
assignees: ''
---

## 🎯 Goal

<!-- 한 줄로 요약된 목적을 작성하세요 -->

## 📋 Background / Context

- 현재 문제·니즈:
- 관련 시스템 / 레포:

## 📝 Requirements

| 항목      | 필수/선택 | 설명                       |
| --------- | --------- | -------------------------- |
| 입력      | 필수      | 예) GitLab MR JSON         |
| 출력      | 필수      | 예) Notion Page 1 row / MR |
| 실패 처리 | 필수      | 재시도 로직, 알림 전송 등  |
| 보안      | 선택      | 토큰 범위, 권한 검증 등    |

## ✅ Acceptance Criteria

- [ ] (예) MR `updated_at` ≤ 7 days 전만 조회
- [ ] 중복 IID 존재 시 Notion 페이지 **업데이트**
- [ ] 레이트 리밋(`429`) 발생 시 지수 백오프 재시도
- [ ] 성공 시 Slack 알림 “Synced N MR(s)”

## 🔨 Tasks

- [ ] 코드 / 설정 파일 위치 파악
- [ ] 기능 구현
- [ ] 단위 테스트 추가
- [ ] `CHANGELOG.md` 업데이트
- [ ] Pull Request 작성 · 리뷰 요청

## ⏰ Due Date

`YYYY-MM-DD`

## 🔗 Related

<!-- 관련 Issue / PR / 외부 문서 링크 -->
