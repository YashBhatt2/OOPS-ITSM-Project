import React from 'react';
import clsx from 'clsx';
import styles from './Table.module.css';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ children, className, ...props }) => {
  return (
    <div className={styles.tableWrapper}>
      <table className={clsx(styles.table, className)} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className,
  ...props
}) => (
  <thead className={clsx(styles.thead, className)} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className,
  ...props
}) => <tbody className={className} {...props}>{children}</tbody>;

export const TableRow: React.FC<
  React.HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }
> = ({ children, selected, className, ...props }) => (
  <tr className={clsx(styles.tr, selected && styles.selected, className)} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className,
  ...props
}) => (
  <th className={clsx(styles.th, className)} scope="col" {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className,
  ...props
}) => (
  <td className={clsx(styles.td, className)} {...props}>
    {children}
  </td>
);

