import { Paging, Select } from "@/features/operations/ui";
import styles from "./employee-screen.module.css";
export function EmployeeDirectoryPaging({list, pageSize, setPageSize, setPage}: {list:{data:{page:number; pageSize:number; total:number}; loading:boolean}; pageSize:number; setPageSize(value:number):void; setPage(value:number):void}) { return (                <div className={styles.paging}>
                  <Select
                    label="Số dòng/trang"
                    value={String(pageSize)}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                  >
                    {[10, 20, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </Select>
                  <Paging
                    page={list.data.page}
                    pageSize={list.data.pageSize}
                    total={list.data.total}
                    disabled={list.loading}
                    onChange={setPage}
                  />
                </div>); }
