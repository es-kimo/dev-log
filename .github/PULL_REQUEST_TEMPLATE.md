<!--
제목 컨벤션 예: [Feat] GitLab MR → Notion 동기화 로직 추가
-->

## 📌 Summary

<!-- 무엇을, 왜 수정/추가했는지 한-두 줄로 설명 -->

## 🔖 Type of change

- [ ] ✨ **Feature** (새 Job·기능)
- [ ] 🐛 **Bug fix** (문제 해결)
- [ ] ♻️ **Refactor** (동작 동일, 구조 개선)
- [ ] 📝 **Docs**  (문서·주석·README)
- [ ] 📦 **CI/CD** (워크플로·빌드·릴리스)
- [ ] 🧹 **Chore**  (의존성 업데이트 등)

## 🔗 Related Issue / Discussion

<!-- e.g. Closes #123, Relates to #45 -->

## 📝 What was done

- 목록 형식으로 주요 변경점 기술
- 예) `lib/gitlab.ts`에 `listMergedMRs()` 추가
- 예) Notion upsert 시 `page.update`로 중복 방지

## ✅ Checklist

- [ ] 코드가 **lint / test / build** 모두 통과
- [ ] 필요한 **단위·통합 테스트**를 작성/수정
- [ ] **CHANGELOG.md** 업데이트 (해당 시)
- [ ] 새/변경 **환경변수**를 README에 명시
- [ ] 리뷰어가 이해할 수 있도록 **스크린샷·로그** 첨부 (UI/로그 변경 시)

## 🧪 How to test

```bash
# 로컬·컨테이너에서 재현 방법 or GitHub Actions 링크
yarn test
```
