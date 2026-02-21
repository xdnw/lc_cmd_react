import * as React from "react"
import { useCallback, useMemo } from "react"
import { cn } from "../../lib/utils"
import { ButtonProps, buttonVariants } from "./button";
import LazyIcon from "./LazyIcon";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
    <nav
        role="navigation"
        aria-label="pagination"
        className={cn("mx-auto flex w-full justify-center", className)}
        {...props}
    />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
    HTMLUListElement,
    React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
    <ul
        ref={ref}
        className={cn("flex flex-row items-center gap-1", className)}
        {...props}
    />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
    HTMLLIElement,
    React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
    <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
    isActive?: boolean
} & Pick<ButtonProps, "size"> &
    React.ComponentProps<"a">

const PaginationLink = ({
    className,
    isActive,
    size = "sm",
    ...props
}: PaginationLinkProps) => (
    <a
        aria-current={isActive ? "page" : undefined}
        className={cn(
            buttonVariants({
                variant: isActive ? "ghost" : "outline",
                size,
            }),
            className,
            isActive ? "" : "cursor-pointer hover:bg-accent active:bg-accent/80"
        )}
        {...props}
    />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
    className,
    ...props
}: React.ComponentProps<typeof PaginationLink>) => (
    <PaginationLink
        aria-label="Go to previous page"
        size="sm"
        className={cn("gap-1 pl-2.5", className)}
        {...props}
    >
        <LazyIcon name="ChevronLeft" className="h-4 w-4" />
        <span>Previous</span>
    </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
    className,
    ...props
}: React.ComponentProps<typeof PaginationLink>) => (
    <PaginationLink
        aria-label="Go to next page"
        size="sm"
        className={cn("gap-1 pr-2.5", className)}
        {...props}
    >
        <span>Next</span>
        <LazyIcon name="ChevronRight" className="h-4 w-4" />
    </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
    className,
    ...props
}: React.ComponentProps<"span">) => (
    <span
        aria-hidden
        className={cn("flex h-4 w-4 items-center justify-center", className)}
        {...props}
    >
        <LazyIcon name="MoreHorizontal" className="h-4 w-4" />
        <span className="sr-only">More pages</span>
    </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
}

export type PaginationProps<T> = {
    items: T[];
    render: (item: T) => React.ReactNode;
    parent?: React.ComponentType<{ children: React.ReactNode }>;
    perPage: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    top?: boolean;
};

export function PaginatedList<T>({ items, render, parent, perPage, currentPage, onPageChange, top = true }: PaginationProps<T>) {
    const totalPages = Math.ceil(items.length / perPage);
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;

    const currentItems = useMemo(() => items.slice(startIndex, endIndex), [items, startIndex, endIndex]);

    const getPageNumbers = useCallback((totalPages: number, currentPage: number, pageRange: number = 2) => {
        const startPage = Math.max(1, currentPage - pageRange);
        const endPage = Math.min(totalPages, currentPage + pageRange);
        const pages = [];

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return pages;
    }, []);

    const pageNumbers = useMemo(() => getPageNumbers(totalPages, currentPage), [totalPages, currentPage, getPageNumbers]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
        const target = e.currentTarget;
        const key = parseInt(target.getAttribute('data-key') || '0', 10);
        const isRelative = target.getAttribute('data-relative') === 'true';

        let page = key;
        if (isRelative) {
            page = currentPage + key;
        }

        if (page >= 1 && page <= totalPages) {
            onPageChange(page);
        }
    }, [currentPage, totalPages, onPageChange]);

    return (
        <div>
            {top === true && <MemoizedRenderItems<T> parent={parent} items={currentItems} render={render} />}
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious size="sm" data-key={-1} data-relative={true} onClick={handleClick} />
                    </PaginationItem>
                    {pageNumbers.map(page => (
                        <PaginationItem key={page}>
                            <PaginationLink data-key={page} data-relative={false} size="sm"
                                isActive={page === currentPage}
                                onClick={handleClick}
                            >
                                {page}
                            </PaginationLink>
                        </PaginationItem>
                    ))}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                        <PaginationItem>
                            <PaginationEllipsis />
                        </PaginationItem>
                    )}
                    <PaginationItem>
                        <PaginationNext size="sm" data-key={1} data-relative={true} onClick={handleClick} />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
            {top === false && <MemoizedRenderItems<T> parent={parent} items={currentItems} render={render} />}
        </div>
    );
}

const RenderItems = <T,>({ items, render, parent: Parent }: { items: T[], render: (item: T) => React.ReactNode, parent?: React.ComponentType<{ children: React.ReactNode }> }) => {
    if (Parent) {
        return <Parent>{items.map((item, index) => <React.Fragment key={index}>{render(item)}</React.Fragment>)}</Parent>;
    }
    return <>{items.map((item, index) => <React.Fragment key={index}>{render(item)}</React.Fragment>)}</>;
};

const MemoizedRenderItems = React.memo(RenderItems) as <T>(props: { items: T[], render: (item: T) => React.ReactNode, parent?: React.ComponentType<{ children: React.ReactNode }> }) => React.ReactNode;