import pb from '@/lib/pocketbase/client'
import type { ExamImage } from '@/types'

export const examImagesService = {
  async getByReportId(reportId: string): Promise<ExamImage[]> {
    return pb.collection('exam_images').getFullList<ExamImage>({
      filter: `report_id = '${reportId}'`,
      sort: 'sort_order,created',
    })
  },

  async getByExamId(examId: string): Promise<ExamImage[]> {
    return pb.collection('exam_images').getFullList<ExamImage>({
      filter: `exam_id = '${examId}'`,
      sort: 'sort_order,created',
    })
  },

  async upload(
    file: File | Blob,
    data: {
      report_id?: string
      exam_id?: string
      caption?: string
      sort_order?: number
      selected_for_print?: boolean
      fileName?: string
    },
  ): Promise<ExamImage> {
    const owner_id = pb.authStore.record?.id
    const formData = new FormData()
    if (data.fileName && file instanceof Blob && !(file instanceof File)) {
      formData.append('file', file, data.fileName)
    } else {
      formData.append('file', file)
    }
    if (owner_id) formData.append('owner_id', owner_id)
    if (data.report_id) formData.append('report_id', data.report_id)
    if (data.exam_id) formData.append('exam_id', data.exam_id)
    if (data.caption !== undefined) formData.append('caption', data.caption)
    if (data.sort_order !== undefined) formData.append('sort_order', String(data.sort_order))
    formData.append(
      'selected_for_print',
      String(data.selected_for_print !== undefined ? data.selected_for_print : true),
    )

    return pb.collection('exam_images').create<ExamImage>(formData)
  },

  async update(id: string, data: Partial<ExamImage>): Promise<ExamImage> {
    return pb.collection('exam_images').update<ExamImage>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return pb.collection('exam_images').delete(id)
  },

  async linkImagesToReport(imageIds: string[], reportId: string): Promise<void> {
    await Promise.all(
      imageIds.map((id) =>
        pb.collection('exam_images').update(id, {
          report_id: reportId,
        }),
      ),
    )
  },

  getImageUrl(record: ExamImage): string {
    return pb.files.getURL(record, record.file)
  },
}
