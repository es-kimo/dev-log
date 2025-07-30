# Contributing to Dev Log

이 프로젝트에 기여해주셔서 감사합니다! 이 문서는 프로젝트에 기여하기 위한 가이드라인을 제공합니다.

## 🚀 시작하기

### 개발 환경 설정

1. 저장소를 클론합니다:

   ```bash
   git clone <repository-url>
   cd dev-log
   ```

2. 의존성을 설치합니다:

   ```bash
   yarn install
   ```

3. 개발 서버를 시작합니다:
   ```bash
   yarn dev
   ```

## 📝 코드 스타일

### ESLint & Prettier

이 프로젝트는 ESLint와 Prettier를 사용하여 일관된 코드 스타일을 유지합니다.

#### 사용 가능한 스크립트

- `yarn lint`: ESLint 검사 실행
- `yarn lint:fix`: ESLint 검사 및 자동 수정
- `yarn format`: Prettier로 코드 포맷팅
- `yarn format:check`: Prettier 포맷팅 검사

#### Pre-commit 훅

커밋 시 자동으로 다음 작업이 실행됩니다:

- ESLint 검사 및 자동 수정
- Prettier 포맷팅

### 코드 스타일 규칙

- **들여쓰기**: 2칸 공백
- **세미콜론**: 사용
- **따옴표**: 작은따옴표 사용
- **줄 길이**: 최대 80자
- **TypeScript**: 엄격한 타입 검사 사용

## 🧪 테스트

### 테스트 실행

```bash
# 모든 테스트 실행
yarn test

# 테스트 감시 모드
yarn test:watch

# 커버리지와 함께 테스트 실행
yarn test:coverage
```

### 테스트 작성 가이드라인

- 각 기능에 대한 단위 테스트 작성
- 테스트 파일명: `*.test.ts` 또는 `*.spec.ts`
- 명확한 테스트 설명 작성

## 🔄 Pull Request 프로세스

1. **브랜치 생성**: 기능별로 새로운 브랜치 생성

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **개발**: 기능 개발 및 테스트 작성

3. **커밋**: 의미있는 커밋 메시지 작성

   ```bash
   git commit -m "feat: add new feature"
   ```

4. **푸시**: 브랜치를 원격 저장소에 푸시

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Pull Request 생성**: GitHub에서 PR 생성

### 커밋 메시지 규칙

[Conventional Commits](https://www.conventionalcommits.org/) 형식을 따릅니다:

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 스타일 변경 (기능에 영향 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가 또는 수정
- `chore`: 빌드 프로세스 또는 보조 도구 변경

## 🐛 이슈 리포트

버그를 발견하셨거나 새로운 기능을 제안하고 싶으시다면:

1. 기존 이슈를 확인하여 중복되지 않는지 확인
2. 새로운 이슈 생성 시 명확한 제목과 설명 작성
3. 가능한 경우 재현 단계 포함

## 📋 체크리스트

PR을 제출하기 전에 다음 사항을 확인해주세요:

- [ ] 코드가 ESLint 규칙을 준수합니다
- [ ] 코드가 Prettier로 포맷팅되었습니다
- [ ] 테스트가 통과합니다
- [ ] 새로운 기능에 대한 테스트가 작성되었습니다
- [ ] 문서가 업데이트되었습니다 (필요한 경우)
- [ ] 커밋 메시지가 Conventional Commits 형식을 따릅니다

## 📞 문의

궁금한 점이 있으시면 이슈를 생성하거나 프로젝트 메인테이너에게 연락해주세요.

감사합니다! 🎉
