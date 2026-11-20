import { forwardRef, useId } from 'react';
import type { CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from './cx.ts';

type FieldBase = {
  label: ReactNode;
  /** 라벨 옆 "(선택)" 표시 */
  optional?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  /** 라벨을 화면에서 숨기고 스크린리더에만 읽힘 */
  hideLabel?: boolean;
  /** 라벨을 입력창 왼쪽에 붙이는 한 줄 배치 */
  inline?: boolean;
  /** 밤하늘 바탕 위에 놓일 때 */
  night?: boolean;
  /** sm: 38px 높이 (도구 막대, 좁은 패널) */
  size?: 'sm' | 'md';
  /** 바깥 묶음(라벨+입력)에 줄 class / style. 레이아웃 배치용 */
  fieldClassName?: string;
  fieldStyle?: CSSProperties;
};

type ShellProps = Omit<FieldBase, 'size'> & { id: string; children: ReactNode };

function FieldShell({ id, label, optional, hint, error, hideLabel, inline, night, fieldClassName, fieldStyle, children }: ShellProps) {
  return (
    <div className={cx('dm-field', inline && 'dm-field--inline', night && 'dm-field--night', fieldClassName)} style={fieldStyle}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'dm-field__label'}>
        {label}
        {optional && <span className="dm-field__optional"> (선택)</span>}
      </label>
      {children}
      {hint && !error && (
        <span id={`${id}-hint`} className="dm-field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="dm-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function describedBy(id: string, hint: unknown, error: unknown) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

function inputClass(size: FieldBase['size'], className?: string) {
  return cx('dm-input', size === 'sm' && 'dm-input--sm', className);
}

export type TextFieldProps = FieldBase & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>;

/** 라벨 + 입력창. id 를 주지 않으면 자동으로 만든다. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, optional, hint, error, hideLabel, inline, night, size, fieldClassName, fieldStyle, id, className, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell {...{ id: fid, label, optional, hint, error, hideLabel, inline, night, fieldClassName, fieldStyle }}>
      <input
        ref={ref}
        id={fid}
        className={inputClass(size, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        {...rest}
      />
    </FieldShell>
  );
});

export type TextAreaProps = FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, optional, hint, error, hideLabel, inline, night, size, fieldClassName, fieldStyle, id, className, rows = 3, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell {...{ id: fid, label, optional, hint, error, hideLabel, inline, night, fieldClassName, fieldStyle }}>
      <textarea
        ref={ref}
        id={fid}
        rows={rows}
        className={inputClass(size, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        {...rest}
      />
    </FieldShell>
  );
});

export type SelectFieldProps = FieldBase & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>;

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, optional, hint, error, hideLabel, inline, night, size, fieldClassName, fieldStyle, id, className, children, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell {...{ id: fid, label, optional, hint, error, hideLabel, inline, night, fieldClassName, fieldStyle }}>
      <select ref={ref} id={fid} className={inputClass(size, className)} aria-describedby={describedBy(fid, hint, error)} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
});
