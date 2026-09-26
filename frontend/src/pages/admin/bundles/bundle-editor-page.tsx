import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorState, Skeleton, notify } from '../../../components/ui';
import { Form, applyServerErrors } from '../../../components/form';
import { bundleAdminApi } from '../../../api/bundle';
import { queryKeys } from '../../../lib/query-keys';
import { paths } from '../../../routes';
import { BundleEditorBody } from './bundle-editor-body';
import {
    BUNDLE_EDITOR_FIELDS, bundleEditorSchema, bundleToFormValues, emptyBundleValues, toBundleWriteRequest,
    type BundleEditorValues,
} from './bundle-editor-schema';

/** Trình soạn combo — `/backoffice/bundles/new` và `/backoffice/bundles/:id`. */
export function BundleEditorPage() {
    const { id } = useParams<{ id: string }>();
    const isNew = !id || id === 'new';
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: queryKeys.catalog.detail(`bundle-${id ?? 'new'}`),
        queryFn: () => bundleAdminApi.get(id!),
        enabled: !isNew,
    });

    const defaultValues = useMemo<BundleEditorValues>(
        () => (query.data ? bundleToFormValues(query.data) : emptyBundleValues()),
        [query.data],
    );

    if (!isNew && query.isPending) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-72" />
                <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
                    <Skeleton className="h-96 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }
    if (!isNew && query.isError) {
        return <ErrorState title="Không tải được combo" error={query.error} onRetry={() => query.refetch()} />;
    }

    const back = () => navigate(paths.backoffice.bundles());

    return (
        <Form
            key={query.data?.id ?? 'new'}
            schema={bundleEditorSchema}
            defaultValues={defaultValues}
            className="space-y-4 pb-24"
            onSubmit={async (values, form) => {
                try {
                    const dto = toBundleWriteRequest(values);
                    if (isNew) await bundleAdminApi.create(dto);
                    else await bundleAdminApi.update(id!, dto);
                    queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
                    notify.success(isNew ? 'Đã tạo combo' : 'Đã lưu combo');
                    back();
                } catch (error) {
                    const applied = applyServerErrors(form.setError, error, BUNDLE_EDITOR_FIELDS);
                    if (applied.length > 0) form.setFocus(applied[0]);
                }
            }}
        >
            {(form) => <BundleEditorBody form={form} isNew={isNew} onBack={back} />}
        </Form>
    );
}

export default BundleEditorPage;
